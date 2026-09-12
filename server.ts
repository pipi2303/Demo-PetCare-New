import "dotenv/config";
import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  initBackupBackgroundService,
  getBackupStatus,
  getAllBackups,
  executeBackup,
  updateBackupConfig,
  verifySnapshotIntegrity
} from "./server/backupService";
import {
  initAuthService,
  verifyPassword,
  setPassword,
  userExists,
  createResetToken,
  consumeResetToken,
  verifyPin,
  findAccountByPin,
  getAccountInfo
} from "./server/authService";
import {
  initSessionService,
  createSession,
  getSession,
  destroySession
} from "./server/sessionService";
import { sendWhatsAppMessage } from "./server/waService";
import {
  createQrisCharge,
  getPaymentStatus,
  verifyWebhookSignature,
  applyWebhookNotification
} from "./server/paymentService";
import {
  createAmbulanceRequest,
  createTelehealthSession,
  initOperationsService,
  listOperations,
  registerAmbulanceUnit,
  transitionAmbulanceRequest,
  transitionTelehealthSession
} from "./server/operationsService";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // Initialize Background Daemon for Automatic End-of-Business-Day Backups
  initBackupBackgroundService();

  // Initialize Password Store & Reset Token Cleanup Daemon
  initAuthService();

  // Initialize in-memory session store cleanup daemon
  initSessionService();

  // Persistent server-side operational state for the safety-critical service flows.
  initOperationsService();

  // Reads the "Authorization: Bearer <token>" header and attaches the
  // resolved session (email/role) to the request, or responds 401 if the
  // token is missing/expired. Role can never come from the client body.
  function requireSession(req: express.Request, res: express.Response, next: express.NextFunction) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
    const session = getSession(token);
    if (!session) {
      return res.status(401).json({ success: false, message: "Sesi tidak valid atau sudah kedaluwarsa. Silakan login ulang." });
    }
    (req as any).session = session;
    next();
  }

  // Like requireSession, but additionally requires the session's role to be
  // one of `allowedRoles`.
  function requireRole(...allowedRoles: string[]) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
      const session = getSession(token);
      if (!session) {
        return res.status(401).json({ success: false, message: "Sesi tidak valid atau sudah kedaluwarsa. Silakan login ulang." });
      }
      if (!allowedRoles.includes(session.role)) {
        return res.status(403).json({ success: false, message: "Akun Anda tidak memiliki hak akses untuk aksi ini." });
      }
      (req as any).session = session;
      next();
    };
  }

  const PRIVILEGED_ROLES = ["owner_klinik", "owner_petshop", "owner_petcare", "admin", "superadmin"];

  // API Health Endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "PetCare ERP Backend", time: new Date().toISOString() });
  });

  // ==========================================
  // TELEHEALTH & AMBULANCE OPERATIONAL FLOWS
  // ==========================================
  const OPERATIONS_ROLES = ["owner_klinik", "owner_petcare", "admin", "dokter", "perawat", "superadmin"];
  const actorFor = (req: express.Request) => (req as any).session?.email || "system";

  app.get("/api/operations", requireRole(...OPERATIONS_ROLES), (_req, res) => {
    res.json({ success: true, data: listOperations() });
  });

  app.post("/api/operations/ambulance/units", requireRole("owner_klinik", "owner_petcare", "admin", "superadmin"), (req, res) => {
    try { res.status(201).json({ success: true, data: registerAmbulanceUnit(req.body || {}, actorFor(req)) }); }
    catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
  });

  app.post("/api/operations/ambulance/requests", requireRole(...OPERATIONS_ROLES), (req, res) => {
    try { res.status(201).json({ success: true, data: createAmbulanceRequest(req.body || {}, actorFor(req)) }); }
    catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
  });

  app.post("/api/operations/ambulance/requests/:id/transition", requireRole(...OPERATIONS_ROLES), (req, res) => {
    try { res.json({ success: true, data: transitionAmbulanceRequest(req.params.id, req.body?.status, actorFor(req), { unitId: req.body?.unitId, note: req.body?.note }) }); }
    catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
  });

  app.post("/api/operations/telehealth/sessions", requireRole("owner_klinik", "owner_petcare", "admin", "dokter", "superadmin"), (req, res) => {
    try { res.status(201).json({ success: true, data: createTelehealthSession(req.body || {}, actorFor(req)) }); }
    catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
  });

  app.post("/api/operations/telehealth/sessions/:id/transition", requireRole("owner_klinik", "owner_petcare", "admin", "dokter", "superadmin"), (req, res) => {
    try { res.json({ success: true, data: transitionTelehealthSession(req.params.id, req.body?.status, actorFor(req), req.body?.note) }); }
    catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
  });

  // ==========================================
  // CLOUD AUTO-BACKUP & DATA INTEGRITY ENDPOINTS
  // ==========================================

  // Get current status & schedule of background auto-backup daemon
  app.get("/api/backup/status", (_req, res) => {
    try {
      const status = getBackupStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all snapshot logs and verification history
  app.get("/api/backup/list", (_req, res) => {
    try {
      const list = getAllBackups();
      res.json({ backups: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Trigger manual on-demand backup snapshot
  app.post("/api/backup/trigger", requireRole(...PRIVILEGED_ROLES), async (req, res) => {
    try {
      const payload = req.body?.payload;
      const snapshot = await executeBackup("MANUAL_ON_DEMAND", payload);
      res.json({ success: true, snapshot });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to execute backup" });
    }
  });

  // Update backup schedule, target cloud bucket, & config
  app.post("/api/backup/config", requireRole(...PRIVILEGED_ROLES), (req, res) => {
    try {
      const updated = updateBackupConfig(req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Verify SHA-256 Checksum & payload integrity of a specific snapshot
  app.post("/api/backup/verify/:id", (req, res) => {
    try {
      const result = verifySnapshotIntegrity(req.params.id);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  // Simulate restore from cloud snapshot
  app.post("/api/backup/restore/:id", requireRole(...PRIVILEGED_ROLES), (req, res) => {
    try {
      const snapshotId = req.params.id;
      const snapshot = getAllBackups().find((b) => b.id === snapshotId);
      if (!snapshot) {
        return res.status(404).json({ error: "Snapshot not found" });
      }
      res.json({
        success: true,
        message: `Database successfully restored and verified from snapshot ${snapshot.filename}`,
        restoredAt: new Date().toISOString(),
        snapshot,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Download snapshot mock file
  app.get("/api/backup/download/:id", requireRole(...PRIVILEGED_ROLES), (req, res) => {
    try {
      const snapshotId = req.params.id;
      const snapshot = getAllBackups().find((b) => b.id === snapshotId);
      if (!snapshot) {
        return res.status(404).json({ error: "Snapshot not found" });
      }
      const dataPayload = {
        meta: {
          snapshotId: snapshot.id,
          filename: snapshot.filename,
          timestamp: snapshot.timestamp,
          sha256Checksum: snapshot.sha256Checksum,
          cloudBucket: snapshot.cloudBucket,
          encryption: snapshot.encryption,
          version: "3.4.0",
        },
        collectionsSummary: snapshot.collectionsSummary,
        schemaIntegrity: "OK_VERIFIED",
      };
      res.setHeader("Content-Disposition", `attachment; filename="${snapshot.filename}"`);
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(dataPayload, null, 2));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // AUTHENTICATION & PASSWORD RECOVERY ENDPOINTS
  // ==========================================

  function getMailTransporter() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !gmailAppPassword) return null;
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword }
    });
  }

  // Validate email + password credentials against the server-side password
  // store, then issue a session. Role/ownership are read from the server's
  // own account directory — the client's claimed role is never trusted.
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email dan kata sandi wajib diisi." });
      }
      const valid = verifyPassword(email, password);
      if (!valid) {
        return res.status(401).json({ success: false, message: "Email atau kata sandi tidak sesuai." });
      }
      const account = getAccountInfo(email);
      if (!account) {
        return res.status(401).json({ success: false, message: "Akun tidak ditemukan." });
      }
      const token = createSession(account.email, account.role, account.ownershipType);
      res.json({ success: true, token, account });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Fast shift login via 4-digit PIN — the PIN is matched against the
  // server-side hashed PIN store, never against a value shipped to the
  // client bundle.
  app.post("/api/auth/login-pin", (req, res) => {
    try {
      const { pin } = req.body || {};
      if (!pin || typeof pin !== "string" || pin.trim().length !== 4) {
        return res.status(400).json({ success: false, message: "PIN shift harus berupa 4 digit angka." });
      }
      const email = findAccountByPin(pin.trim());
      if (!email) {
        return res.status(401).json({ success: false, message: "PIN yang dimasukkan tidak terdaftar." });
      }
      const account = getAccountInfo(email);
      if (!account) {
        return res.status(401).json({ success: false, message: "Akun tidak ditemukan." });
      }
      const token = createSession(account.email, account.role, account.ownershipType);
      res.json({ success: true, token, account });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Switch the active session to a different demo persona/account. The
  // security property here comes entirely from verifying the TARGET
  // account's own PIN — it does NOT require the caller to already hold a
  // valid session (the app's zero-friction "browse without logging in"
  // demo mode has no session at all, and should still be able to PIN-switch
  // into a real one). This replaces the old client-only "switchRole" which
  // let anyone become anyone with a single click and no credential at all.
  app.post("/api/auth/switch-account", (req, res) => {
    try {
      const { targetEmail, pin } = req.body || {};
      if (!targetEmail || !pin) {
        return res.status(400).json({ success: false, message: "Email tujuan dan PIN wajib diisi." });
      }
      if (!verifyPin(targetEmail, pin)) {
        return res.status(401).json({ success: false, message: "PIN tidak sesuai untuk akun tujuan." });
      }
      const account = getAccountInfo(targetEmail);
      if (!account) {
        return res.status(404).json({ success: false, message: "Akun tujuan tidak ditemukan." });
      }
      // Best-effort cleanup of the old session, if any — not required for
      // the switch to succeed, stale sessions simply expire after their TTL.
      const oldToken = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (oldToken) destroySession(oldToken);
      const token = createSession(account.email, account.role, account.ownershipType);
      res.json({ success: true, token, account });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // End the current session (logout).
  app.post("/api/auth/logout", requireSession, (req, res) => {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    destroySession(token);
    res.json({ success: true });
  });

  // Request a password reset link to be emailed to the account owner
  app.post("/api/auth/forgot-password", async (req, res) => {
    const genericMessage = "Kalau email tersebut terdaftar, tautan pemulihan sandi sudah dikirim.";
    try {
      const { email } = req.body || {};
      if (!email || !userExists(email)) {
        // Always respond with a generic success message to avoid user enumeration
        return res.json({ success: true, message: genericMessage });
      }

      const transporter = getMailTransporter();
      const token = createResetToken(email);
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const resetLink = `${appUrl}/?resetToken=${token}`;

      if (!transporter) {
        console.warn(
          `[AuthService] GMAIL_USER/GMAIL_APP_PASSWORD belum dikonfigurasi — email reset tidak dikirim. Link (dev only): ${resetLink}`
        );
        return res.json({ success: true, message: genericMessage });
      }

      await transporter.sendMail({
        from: `"PetCare ERP" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Pemulihan Kata Sandi - PetCare ERP",
        html: `
          <p>Kami menerima permintaan pemulihan kata sandi untuk akun PetCare ERP Anda.</p>
          <p><a href="${resetLink}">Klik di sini untuk mengatur kata sandi baru</a></p>
          <p>Tautan ini berlaku selama 30 menit. Jika Anda tidak meminta ini, abaikan email ini.</p>
        `
      });

      res.json({ success: true, message: genericMessage });
    } catch (err: any) {
      console.error("[AuthService] Forgot Password Error:", err);
      res.json({ success: true, message: genericMessage });
    }
  });

  // Confirm a password reset using the token emailed to the user
  app.post("/api/auth/reset-password", (req, res) => {
    try {
      const { token, newPassword } = req.body || {};
      if (!token || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: "Token tidak valid atau kata sandi baru minimal 6 karakter." });
      }
      const email = consumeResetToken(token);
      if (!email) {
        return res.status(400).json({ success: false, message: "Tautan reset tidak valid atau sudah kedaluwarsa." });
      }
      setPassword(email, newPassword);
      res.json({ success: true, message: "Kata sandi berhasil diperbarui. Silakan login dengan kata sandi baru." });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // WhatsApp Status check endpoint mock/fonnte check
  app.get("/api/wa/status", (_req, res) => {
    const token = process.env.WA_TOKEN;
    res.json({
      configured: !!token,
      status: token ? "connected" : "disconnected",
      provider: "Fonnte WhatsApp API"
    });
  });

  // Kirim notifikasi WhatsApp otomatis (antrean, reminder vaksin, invoice, dsb.) via Fonnte.
  // Jika WA_TOKEN belum dikonfigurasi, mengembalikan simulated:true agar frontend
  // bisa fallback ke tautan wa.me manual tanpa mematahkan fitur.
  app.post("/api/wa/send", requireSession, async (req, res) => {
    try {
      const { phone, message } = req.body || {};
      if (!phone || !message) {
        return res.status(400).json({ success: false, simulated: false, message: "Nomor telepon dan pesan wajib diisi." });
      }
      const result = await sendWhatsAppMessage(phone, message);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, simulated: false, message: err.message });
    }
  });

  // ==========================================
  // PAYMENT GATEWAY (MIDTRANS QRIS) ENDPOINTS
  // ==========================================

  // Buat charge QRIS baru untuk sebuah invoice/order. Kalau MIDTRANS_SERVER_KEY
  // belum dikonfigurasi, balik simulated:true agar frontend fallback ke QR
  // dekoratif lama tanpa mematahkan fitur.
  app.post("/api/payment/qris/charge", requireSession, async (req, res) => {
    try {
      const { orderId, grossAmount, customerName } = req.body || {};
      if (!orderId || !grossAmount) {
        return res.status(400).json({ success: false, simulated: false, message: "orderId dan grossAmount wajib diisi." });
      }
      const result = await createQrisCharge(orderId, Number(grossAmount), customerName || "Pelanggan");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, simulated: false, message: err.message });
    }
  });

  // Client poll status transaksi di sini setelah QR ditampilkan.
  app.get("/api/payment/status/:orderId", requireSession, async (req, res) => {
    try {
      const result = await getPaymentStatus(req.params.orderId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Webhook notifikasi Midtrans — dipanggil Midtrans sendiri, bukan browser staf,
  // jadi TIDAK pakai requireSession. Keamanannya lewat verifikasi signature_key,
  // bukan session token.
  app.post("/api/payment/webhook", (req, res) => {
    try {
      const body = req.body || {};
      if (!verifyWebhookSignature(body)) {
        return res.status(403).json({ success: false, message: "Signature tidak valid." });
      }
      applyWebhookNotification(body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Gemini AI Assistant Chat Endpoint
  app.post("/api/ai/chat", requireSession, async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY is not configured in environment settings."
        });
      }

      const { message, context, history } = req.body;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `
You are PetCare AI Assistant - an intelligent veterinary clinical advisor and clinic management assistant for PetCare ERP (Sistem Manajemen Klinik Hewan & ERP).
You assist veterinarians, clinic owners, nurses, groomers, and pet owners with:
1. Veterinary clinical diagnostic support, drug dosage recommendations, and triage tips (always include clinical disclaimers).
2. Operational summaries based on the current live clinic context provided (patient queue, active inpatient board, low stock medicines, daily revenue, care plans).
3. Professional, empathetic, concise Indonesian responses formatted in clean markdown.

Current Clinic Operational Context:
${JSON.stringify(context || {}, null, 2)}
`;

      const contents = [
        ...(history || []).map((h: { role: string; content: string }) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }]
        })),
        { role: "user", parts: [{ text: message }] }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      return res.json({ response: response.text });
    } catch (err: any) {
      console.error("AI Chat Error:", err);
      return res.status(500).json({ error: err.message || "Failed to generate AI response" });
    }
  });

  // Gemini AI Medical History to Clinical SOAP Analysis Endpoint
  app.post("/api/ai/analyze-history-soap", requireSession, async (req, res) => {
    try {
      const { petInfo, unstructuredHistoryText, currentComplaint } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Return structured clinical fallback when API key is missing
        return res.json({
          success: true,
          source: "fallback",
          data: generateFallbackSoapAnalysis(petInfo, unstructuredHistoryText, currentComplaint)
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemPrompt = `
You are an expert Veterinary Medical Informaticist & Clinical SOAP Specialist in a multi-specialty animal hospital.
Your job is to rigorously analyze messy, unstructured past medical history text (previous EMR logs, past clinical encounters, referral letters, discharge instructions, owner descriptions, lab notes) for a specific veterinary patient, and synthesize a concise, structured, and clinically precise summary formatted specifically for the 'Clinical SOAP' section in the Clinic EMR module.

Guidelines:
- Subjective (S): Extract chronological HPI, previous recurrent patterns, owner complaints, appetite/activity status, and relevant past medical history.
- Objective (O): Extract baseline vitals, historical physical examination anomalies, anatomical findings to re-evaluate, and key diagnostic indicators.
- Assessment (A): Formulate a clear working diagnosis with suggested ICD-10 code (e.g., K29.7, H60.9, N30.0, L24.9, N18.9), differential diagnoses, severity rating ('Ringan' | 'Sedang' | 'Berat' | 'Kritis'), and highlight any known drug/food allergies.
- Plan (P): Outline continuing/adjusted medication protocols with drug name, dosage, frequency, and duration; recommended diagnostics; and client communication points.
- Provide a full concise markdown synthesis string (conciseSoapSummaryText) ready for instant copy-pasting or direct transfer into the clinic EMR.
- All clinical terms, instructions, and notes must be in professional Indonesian veterinary terminology.

Respond ONLY with valid JSON conforming to this structure:
{
  "chiefComplaint": "string",
  "subjective": {
    "historyOfPresentIllness": "string",
    "pastMedicalHistorySummary": "string",
    "ownerObservations": "string",
    "chronicityAndRecurrence": "string"
  },
  "objective": {
    "suggestedTempC": 38.5,
    "suggestedHr": 110,
    "suggestedRr": 28,
    "suggestedWeightKg": 4.2,
    "physicalExamFocus": "string",
    "anatomicalFindings": {
      "Abdomen": "string",
      "Telinga": "string",
      "Gigi & Mulut": "string"
    }
  },
  "assessment": {
    "workingDiagnosis": "string",
    "suggestedIcdCode": "string",
    "differentialDiagnosis": "string",
    "severity": "Ringan",
    "clinicalRisksAndAllergies": ["string"]
  },
  "plan": {
    "medicationPlanSummary": "string",
    "suggestedDrugs": [
      {
        "drugName": "string",
        "dosage": "string",
        "frequency": "string",
        "durationDays": 5,
        "indication": "string"
      }
    ],
    "diagnosticsRecommended": "string",
    "monitoringAndFollowUp": "string",
    "clientEducationNotes": "string"
  },
  "conciseSoapSummaryText": "string"
}
`;

      const promptContent = `
Patient Details:
- Name: ${petInfo?.name || "Pasien"}
- Species/Breed: ${petInfo?.species || "Hewan"} (${petInfo?.breed || "-"})
- Age/Birth: ${petInfo?.birthDate || "-"}
- Current Weight: ${petInfo?.weightKg || 4.0} kg
- Known Allergies: ${petInfo?.allergies || "Tidak ada riwayat alergi yang dicatat"}
- Current Visit Complaint: ${currentComplaint || "Pemeriksaan dan evaluasi riwayat medis"}

Unstructured Previous Medical History Text to Analyze:
"""
${unstructuredHistoryText || "Riwayat medis sebelumnya belum terisi."}
"""

Please synthesize this unstructured clinical record into the structured Clinical SOAP format as specified.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: promptContent,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.3,
        }
      });

      const responseText = response.text || "{}";
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (pErr) {
        console.warn("Could not parse JSON directly from Gemini, falling back to regex extraction:", pErr);
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          parsedData = generateFallbackSoapAnalysis(petInfo, unstructuredHistoryText, currentComplaint);
        }
      }

      return res.json({
        success: true,
        source: "gemini-3.7-flash",
        data: parsedData
      });
    } catch (err: any) {
      console.error("AI History SOAP Analysis Error:", err);
      // Fallback on error
      const { petInfo, unstructuredHistoryText, currentComplaint } = req.body;
      return res.json({
        success: true,
        source: "fallback_recovery",
        data: generateFallbackSoapAnalysis(petInfo, unstructuredHistoryText, currentComplaint)
      });
    }
  });

  function generateFallbackSoapAnalysis(petInfo: any, rawText: string, currentComplaint?: string) {
    const petName = petInfo?.name || "Milo";
    const species = petInfo?.species || "Kucing";
    const weight = petInfo?.weightKg || (species === "Anjing" ? 28.5 : 4.2);
    const allergies = petInfo?.allergies || "Tidak ada alergi yang dilaporkan";

    const isDigestive = /muntah|diare|lambung|gastritis|nafsu makan|pakan|lemas/i.test(rawText || "") || /muntah|gastritis/i.test(currentComplaint || "");
    const isSkin = /gatal|kulit|jamur|scabies|rontok|merah|kutu|alergi/i.test(rawText || "");
    const isEar = /telinga|otitis|serumen|garuk telinga/i.test(rawText || "");
    const isUrinary = /flutd|urin|kencing|pasir|obstruksi/i.test(rawText || "");
    const isRenal = /ginjal|ckd|creatinine|bun|minum banyak/i.test(rawText || "");

    let diagnosis = "[K29.7] Gastritis Akut & Dispepsia Rekuren";
    let icd = "K29.7";
    let diff = "Pankreatitis Akut, Intoleransi Pakan, Korpus Alienum";
    let severity: 'Ringan' | 'Sedang' | 'Berat' | 'Kritis' = 'Sedang';
    let drugs = [
      { drugName: "Amoxicillin + Clavulanate 250mg", dosage: "1/2 tablet", frequency: "2x1 hari sesudah makan", durationDays: 5, indication: "Antibiotik spektrum luas" },
      { drugName: "Sucralfate Sirup", dosage: "1.5 mL", frequency: "3x1 hari 30 menit ac", durationDays: 5, indication: "Gastroprotektor mukosa lambung" }
    ];

    if (allergies.toLowerCase().includes("amoxicillin")) {
      drugs = [
        { drugName: "Enrofloxacin 50mg", dosage: "1/2 tablet", frequency: "1x1 hari", durationDays: 5, indication: "Antibiotik alternatif non-penisilin (Alergi Amoxicillin)" },
        { drugName: "Sucralfate Sirup", dosage: "1.5 mL", frequency: "3x1 hari 30 menit ac", durationDays: 5, indication: "Gastroprotektor mukosa lambung" }
      ];
    }

    if (isEar) {
      diagnosis = "[H60.9] Otitis Externa Dextra/Sinistra";
      icd = "H60.9";
      diff = "Otodectes Cynotis, Infeksi Sekunder Malassezia, Alergi";
      severity = "Ringan";
      drugs = [
        { drugName: "Otopain Ear Drops 10ml", dosage: "3 tetes", frequency: "2x sehari", durationDays: 7, indication: "Antiinflamasi & antibiotik topikal telinga" }
      ];
    } else if (isSkin) {
      diagnosis = "[L24.9] Flea Allergy Dermatitis & Pyoderma Superfisial";
      icd = "L24.9";
      diff = "Scabies Sarcoptes, Ringworm Microsporum, Atopi Makanan";
      severity = "Sedang";
      drugs = [
        { drugName: "Cefalexin 250mg", dosage: "1 tablet", frequency: "2x sehari", durationDays: 10, indication: "Antibiotik kulit lini pertama" },
        { drugName: "Shampoo Chlorhexidine 2%", dosage: "Mandi 2x/minggu", frequency: "Kontak 10 menit", durationDays: 14, indication: "Antiseptik topikal" }
      ];
    } else if (isUrinary) {
      diagnosis = "[N30.0] Feline Lower Urinary Tract Disease (FLUTD)";
      icd = "N30.0";
      diff = "Urolithiasis Struvit/Oxalate, Sistitis Idiopatik (FIC)";
      severity = "Berat";
      drugs = [
        { drugName: "Meloxicam Injeksi/Oral", dosage: "0.1 mg/kg", frequency: "1x sehari", durationDays: 3, indication: "Analgesik & antiinflamasi saluran kemih" },
        { drugName: "Prazosin 1mg", dosage: "1/4 tablet", frequency: "2x sehari", durationDays: 5, indication: "Spasmolitik relaksasi uretra" }
      ];
    } else if (isRenal) {
      diagnosis = "[N18.9] Chronic Kidney Disease (CKD) Stadium II";
      icd = "N18.9";
      diff = "Acute Kidney Injury, Pyelonefritis, Glomerulonefritis";
      severity = "Berat";
      drugs = [
        { drugName: "Cairan Infus Ringer Lactate", dosage: "50-100 mL/kg/hari", frequency: "Subkutan / IV", durationDays: 3, indication: "Hidrasi & rehidrasi ginjal" },
        { drugName: "Ipakitine Renal Binder", dosage: "1 scoop", frequency: "2x sehari dicampur pakan", durationDays: 30, indication: "Penjerap fosfat intestinal" }
      ];
    }

    const complaint = currentComplaint || (isDigestive ? "Muntah & penurunan nafsu makan berulang" : isEar ? "Gatal telinga & serumen berlebih" : isSkin ? "Gatal kulit & kerontokan bulu" : "Evaluasi riwayat medis dan kontrol berkala");

    return {
      chiefComplaint: complaint,
      subjective: {
        historyOfPresentIllness: `Berdasarkan rekam jejak medis historis ${petName}, pasien memiliki riwayat ${complaint}. Gejala bersifat intermiten dengan keluhan utama lesu dan penurunan nafsu makan yang dilaporkan pemilik.`,
        pastMedicalHistorySummary: `Pasien ${petName} (${species}, ${weight} kg) pernah menjalani perawatan serupa pada kunjungan terdahulu. Riwayat alergi tercatat: "${allergies}".`,
        ownerObservations: `Pemilik mencatat pasien tampak kurang aktif, minum masih mau sedikit-sedikit, dan menunjukkan ketidaknyamanan saat disentuh di area terkait.`,
        chronicityAndRecurrence: `Episode berulang tercatat dari histori rekam medis. Perlu evaluasi faktor predisposisi dan modifikasi protokol jangka panjang.`
      },
      objective: {
        suggestedTempC: 38.6,
        suggestedHr: species === "Kucing" ? 140 : 96,
        suggestedRr: 26,
        suggestedWeightKg: weight,
        physicalExamFocus: `Status hidrasi (turgor kulit), warna selaput lendir mukosa, CRT, palpasi abdomen, serta auskultasi kardiorespirasi.`,
        anatomicalFindings: {
          "Abdomen": isDigestive ? "Palpasi abdomen teraba sedikit tegang dan sensitif pada kuadran epigastrik." : "Abdomen supel, tidak teraba massa atau distensi.",
          "Telinga": isEar ? "Eritema ringan saluran telinga, serumen serosa kekuningan." : "Saluran telinga bersih, bebas ektoparasit.",
          "Kulit & Bulu": isSkin ? "Lesi eritematosa multipel, alopesia fokal, dan krusta superfisial." : "Turgor kulit elastis < 2 detik, kilau bulu baik.",
          "Gigi & Mulut": "Mukosa merah muda lembap, CRT < 2 detik, kalkulus gigi ringan."
        }
      },
      assessment: {
        workingDiagnosis: diagnosis,
        suggestedIcdCode: icd,
        differentialDiagnosis: diff,
        severity: severity,
        clinicalRisksAndAllergies: [
          `Alergi Tercatat: ${allergies}`,
          "Risiko dehidrasi sekunder jika asupan cairan tidak tercapai",
          "Waspada kontraindikasi obat terhadap profil organ pasien"
        ]
      },
      plan: {
        medicationPlanSummary: `Berikan terapi simtomatik & kausatif sesuai diagnosis kerja. Hindari obat yang memicu alergi (${allergies}).`,
        suggestedDrugs: drugs,
        diagnosticsRecommended: isDigestive ? "Hematologi Rutin (CBC), Kimia Darah (ALT, Creatinine), Foto Rontgen Abdomen 2 posisi jika muntah persisten." : isRenal ? "Pemeriksaan Panel Ginjal (BUN, Creatinine, Fosfat, SDMA) & Urinalisis." : isSkin ? "Skin Scraping & Sitologi Jamur / Wood's Lamp." : "Evaluasi sitologi serumen telinga.",
        monitoringAndFollowUp: "Monitoring tanda vital dan nafsu makan di rumah. Jadwalkan kontrol evaluasi ulang dalam 3-5 hari ke depan.",
        clientEducationNotes: "Berikan makanan diet lunak / mudah cerna porsi kecil tapi sering. Pastikan air minum bersih selalu tersedia. Segera bawa kembali ke klinik jika terjadi muntah berulang atau lemas berat."
      },
      conciseSoapSummaryText: `**[RINGKASAN CLINICAL SOAP - SINTESIS RIWAYAT MEDIS AI]**
Pasien: ${petName} (${species} - ${weight} kg)
Riwayat Alergi: ${allergies}

**SUBJECTIVE (S):**
- Keluhan: ${complaint}
- Riwayat Penyakit: Gejala bersifat intermiten berdasarkan data medis terdahulu. Pemilik melaporkan penurunan nafsu makan dan perubahan keaktifan.
- Faktor Risiko: Riwayat alergi (${allergies}) dan episode kekambuhan berkala.

**OBJECTIVE (O):**
- Tanda Vital Estimasi/Target: Suhu: 38.6°C | HR: ${species === "Kucing" ? 140 : 96} bpm | RR: 26 rpm | BB: ${weight} kg
- Pemeriksaan Fisik: CRT < 2 detik, mukosa merah muda. Fokus re-evaluasi pada area ${isDigestive ? 'abdomen' : isEar ? 'telinga' : isSkin ? 'dermatologi' : 'sistemik'}.

**ASSESSMENT (A):**
- Diagnosis Kerja: ${diagnosis}
- Diagnosis Banding: ${diff}
- Tingkat Keparahan: ${severity}
- Peringatan Klinis: ${allergies.toLowerCase().includes('tidak') ? 'Tidak ada kontraindikasi mayor' : 'HINDARI ' + allergies}

**PLAN (P):**
- Terapi Obat: ${drugs.map(d => `${d.drugName} (${d.dosage} - ${d.frequency}, ${d.durationDays} hari)`).join('; ')}
- Diagnostik: ${isDigestive ? 'Hematologi Darah Lengkap & Profil Biokimia' : 'Evaluasi klinis lanjutan'}
- Edukasi Pemilik: Diet sesuai instruksi, pantau hidrasi, kontrol ulang 3-5 hari.`
    };
  }

  // Gemini AI-Driven Patient EMR Triage Urgency Analysis Endpoint
  app.post("/api/ai/triage-analysis", requireSession, async (req, res) => {
    try {
      const { petInfo, currentVisit, latestSoap, historySummary } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(200).json({
          success: true,
          source: "fallback",
          data: generateFallbackTriageResult(petInfo, currentVisit, latestSoap)
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemPrompt = `
You are an expert Veterinary Emergency & Critical Care (ECC) Triage AI specialist.
Your task is to analyze veterinary EMR data (vital signs, clinical symptoms, chief complaint, medical history, species, weight) and classify the patient into one of the 4 standard Veterinary Triage List (VTL) categories:

1. 'P1' (RED / CRITICAL - Resusitasi / Mengancam Jiwa): Penanganan < 5 menit (dispnea berat, sianosis, henti napas/jantung, syok hemoragik, kejang aktif, trauma masif, obstruksi uretra total FLUTD, dilatasi lambung GDV).
2. 'P2' (ORANGE / URGENT - Sangat Mendesak): Penanganan < 15-30 menit (dehidrasi berat, muntah/diare profus berdarah, luka dalam terbuka, distres nyeri hebat, demam tinggi >40°C, retensi urin parsial).
3. 'P3' (YELLOW / SEMI-URGENT - Semi-Mendesak): Penanganan 30-60 menit (nafsu makan turun 1-2 hari, batuk ringan/flu, otitis bernanah, pincang ringan, lesi kulit gatal/jamur).
4. 'P4' (GREEN / NON-URGENT - Rutin / Elektif): Penanganan > 60 menit (vaksinasi tahunan, check-up rutin, potong kuku, deworming berkala, kontrol sehat).

Respond strictly with valid JSON conforming to:
{
  "level": "P1" | "P2" | "P3" | "P4",
  "label": "string",
  "severityScore": number (10 to 100),
  "colorClass": "string",
  "bgClass": "string",
  "borderClass": "string",
  "badgeClass": "string",
  "summary": "string in Indonesian",
  "symptomTriggers": ["string in Indonesian"],
  "vitalFlags": [
    { "parameter": "string", "value": "string", "status": "normal" | "warning" | "critical" }
  ],
  "recommendedActions": ["string in Indonesian"],
  "triageRationale": "string in Indonesian"
}
`;

      const prompt = `
Pasien: ${petInfo?.name || 'Anabul'} (${petInfo?.species || 'Hewan'}, ${petInfo?.breed || '-'}, ${petInfo?.weightKg || 4} kg). Alergi: ${petInfo?.allergies || 'Nihil'}
Keluhan Kunjungan Saat Ini: ${currentVisit?.complaint || 'Tidak ada catatan kunjungan'}
Catatan SOAP EMR Terakhir:
- Chief Complaint: ${latestSoap?.chiefComplaint || '-'}
- Anamnesis / HPI: ${latestSoap?.hpi || '-'}
- Tanda Vital: Suhu: ${latestSoap?.vitals?.temp || '-'}°C, HR: ${latestSoap?.vitals?.hr || '-'} bpm, RR: ${latestSoap?.vitals?.rr || '-'} x/m, SpO2: ${latestSoap?.vitals?.spO2 || '-'}%
- Pemeriksaan Fisik: ${latestSoap?.examNotes || '-'}
- Diagnosis Kerja: ${latestSoap?.workingDiagnosis || '-'} (Severity: ${latestSoap?.severityScore || '-'})
Riwayat Medis Sebelumnya:
${(historySummary || []).join('\n')}

Lakukan analisis keparahan gejala dan tentukan Triage Urgency Level secara akurat.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const text = response.text || "{}";
      let parsed = JSON.parse(text);
      return res.json({ success: true, source: "gemini-3.7-flash", data: parsed });
    } catch (err: any) {
      console.error("AI Triage Analysis Error:", err);
      const { petInfo, currentVisit, latestSoap } = req.body;
      return res.json({
        success: true,
        source: "fallback_engine",
        data: generateFallbackTriageResult(petInfo, currentVisit, latestSoap)
      });
    }
  });

  function generateFallbackTriageResult(petInfo: any, currentVisit: any, latestSoap: any) {
    const complaint = `${currentVisit?.complaint || ''} ${latestSoap?.chiefComplaint || ''} ${latestSoap?.hpi || ''} ${latestSoap?.examNotes || ''}`.toLowerCase();
    const isCritical = /sesak|sianosis|darurat|kritis|kejang|tertabrak|pendarahan|tidak bisa kencing|retensi urin/i.test(complaint);
    const isUrgent = /muntah darah|diare berdarah|dehidrasi|nyeri|demam tinggi|luka dalam/i.test(complaint);
    const isRoutine = /vaksin|sehat|rutin|potong kuku|grooming|deworming/i.test(complaint);

    if (isCritical) {
      return {
        level: "P1",
        label: "P1 - KRITIS / RESUSITASI",
        severityScore: 92,
        colorClass: "text-rose-700 dark:text-rose-300",
        bgClass: "bg-rose-500/15",
        borderClass: "border-rose-500/40",
        badgeClass: "bg-rose-600 text-white border-rose-700 shadow-rose-500/30",
        summary: "Kondisi gawat darurat mengancam nyawa. Memerlukan penanganan dokter seketika (<5 menit).",
        symptomTriggers: ["Distres Akut / Tanda Vital Kritis", "Kebutuhan Oksigenasi Segera"],
        vitalFlags: [
          { parameter: "Laju Napas (RR)", value: "Kritis", status: "critical" },
          { parameter: "Perfusi CRT", value: "> 3 detik", status: "critical" }
        ],
        recommendedActions: ["Oksigenasi & stabilisasi jalan napas", "Pemasangan IV Catheter segera", "Pemberitahuan Tim ECC"],
        triageRationale: "Gejala mengindikasikan ancaman kegagalan respirasi/sirkulasi akut berdasarkan analisis catatan EMR."
      };
    } else if (isUrgent) {
      return {
        level: "P2",
        label: "P2 - SANGAT MENDESAK",
        severityScore: 68,
        colorClass: "text-amber-700 dark:text-amber-300",
        bgClass: "bg-amber-500/15",
        borderClass: "border-amber-500/40",
        badgeClass: "bg-amber-600 text-white border-amber-700 shadow-amber-500/30",
        summary: "Kondisi berpotensi memburuk cepat. Diperiksa dokter dalam waktu <15-30 menit.",
        symptomTriggers: ["Gejala Akut Sistemik", "Risiko Dehidrasi & Toksisitas"],
        vitalFlags: [
          { parameter: "Suhu Tubuh", value: "39.8°C", status: "warning" }
        ],
        recommendedActions: ["Pemeriksaan tanda vital serial", "Fluid resuscitation assessment", "Pemberian antiemetik/analgesik"],
        triageRationale: "Ditemukan tanda-tanda distres akut sedang yang memerlukan tindakan cepat sebelum komplikasi terjadi."
      };
    } else if (isRoutine) {
      return {
        level: "P4",
        label: "P4 - NON-URGENT / RUTIN",
        severityScore: 18,
        colorClass: "text-emerald-700 dark:text-emerald-300",
        bgClass: "bg-emerald-500/15",
        borderClass: "border-emerald-500/40",
        badgeClass: "bg-emerald-600 text-white border-emerald-700",
        summary: "Kondisi sehat & stabil. Layanan terjadwal / preventif tanpa ancaman fisiologis.",
        symptomTriggers: ["Pemeriksaan Preventif / Jadwal Vaksin"],
        vitalFlags: [
          { parameter: "Tanda Vital", value: "Normal", status: "normal" }
        ],
        recommendedActions: ["Pemeriksaan pra-vaksinasi standar", "Edukasi kesehatan berkala"],
        triageRationale: "Pasien dalam kondisi fisiologis normal tanpa gejala akut."
      };
    } else {
      return {
        level: "P3",
        label: "P3 - SEMI-MENDESAK",
        severityScore: 38,
        colorClass: "text-amber-800 dark:text-amber-200",
        bgClass: "bg-yellow-500/15",
        borderClass: "border-yellow-500/40",
        badgeClass: "bg-yellow-500 text-slate-900 border-yellow-600",
        summary: "Kondisi stabil dengan keluhan klinis ringan hingga sedang. Target waktu tunggu 30-60 menit.",
        symptomTriggers: ["Keluhan Klinis Sub-Akut", "Nafsu Makan Menurun"],
        vitalFlags: [
          { parameter: "Tanda Vital", value: "Stabil", status: "normal" }
        ],
        recommendedActions: ["Pemeriksaan fisik sistemik pada antrean reguler", "Pencatatan riwayat anamnesis lengkap"],
        triageRationale: "Gejala sub-akut tanpa ancaman kegawatdaruratan langsung, tanda vital dalam batas toleransi."
      };
    }
  }

  // Gemini AI-Driven Critical Medical Inventory Forecasting Endpoint
  app.post("/api/ai/forecast-inventory", requireSession, async (req, res) => {
    try {
      const {
        seasonScenario = "pancaroba_hujan",
        criticalItems = [],
        activeInpatientsCount = 1,
        scheduledSurgeriesCount = 3,
        leadTimeBufferDays = 0,
      } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          success: true,
          source: "fallback",
          data: generateFallbackInventoryInsights(
            seasonScenario,
            criticalItems,
            activeInpatientsCount,
            scheduledSurgeriesCount,
            leadTimeBufferDays
          ),
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemPrompt = `
You are an expert Chief Veterinary Pharmacist & Epidemiological Supply Chain Analyst for a multi-branch animal hospital network.
Your task is to analyze historical consumption, seasonal disease patterns, supplier lead-times, and active inpatient/surgical demand to produce executive clinical supply recommendations.

Guidelines:
1. Executive Summary: Provide an incisive, actionable 2-3 sentence overview of inventory vulnerability and stockout risks.
2. Epidemiological Risk Factors: Highlight 3-4 specific veterinary disease correlations (e.g. Pancaroba season causing spikes in Parvo/FLUTD/Pyoderma, Holiday boarding causing vaccine surges).
3. Clinical Priority Rankings: Rank the most urgent 3-5 critical medical supplies (e.g., Ringer Lactate, Isoflurane, Ketamine, Rabies Vaccine, Maropitant) explaining why stockout is dangerous and the exact immediate action needed.
4. Supplier Optimization Advice: Provide 3 strategic procurement tips (e.g. bulk buffer pooling, dual-sourcing cold-chain vaccines, negotiating lead-time guarantees).
5. Budget Impact Analysis: Concise summary of estimated procurement capital required versus revenue loss prevention.

Respond ONLY with valid JSON conforming to this schema:
{
  "executiveSummary": "string",
  "epidemiologicalRiskFactors": ["string"],
  "clinicalPriorityRankings": [
    {
      "sku": "string",
      "name": "string",
      "priorityReason": "string",
      "immediateAction": "string"
    }
  ],
  "supplierOptimizationAdvice": ["string"],
  "budgetImpactAnalysis": "string",
  "preparedTimestamp": "string"
}
`;

      const promptContent = `
Current Clinic Operational & Supply Context:
- Active Inpatient Count: ${activeInpatientsCount} pasien
- Scheduled Surgeries (Next 7 Days): ${scheduledSurgeriesCount} prosedur
- Selected Seasonality Scenario: ${seasonScenario}
- Lead Time Buffer Configured: +${leadTimeBufferDays} hari
- Tracked Critical Supplies Summary:
${JSON.stringify(criticalItems.slice(0, 10), null, 2)}

Please perform the AI-driven clinical forecasting analysis and provide strategic guidance.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: promptContent,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const responseText = response.text || "{}";
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (pErr) {
        console.warn("Could not parse Gemini JSON response directly, recovering:", pErr);
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          parsedData = JSON.parse(match[0]);
        } else {
          parsedData = generateFallbackInventoryInsights(
            seasonScenario,
            criticalItems,
            activeInpatientsCount,
            scheduledSurgeriesCount,
            leadTimeBufferDays
          );
        }
      }

      return res.json({
        success: true,
        source: "gemini-3.7-flash",
        data: parsedData,
      });
    } catch (err: any) {
      console.error("AI Inventory Forecast Error:", err);
      const {
        seasonScenario = "pancaroba_hujan",
        criticalItems = [],
        activeInpatientsCount = 1,
        scheduledSurgeriesCount = 3,
        leadTimeBufferDays = 0,
      } = req.body;

      return res.json({
        success: true,
        source: "fallback_recovery",
        data: generateFallbackInventoryInsights(
          seasonScenario,
          criticalItems,
          activeInpatientsCount,
          scheduledSurgeriesCount,
          leadTimeBufferDays
        ),
      });
    }
  });

  function generateFallbackInventoryInsights(
    season: string,
    items: any[],
    inpatients: number,
    surgeries: number,
    leadTimeBuffer: number
  ) {
    const isRain = season === "pancaroba_hujan";
    const isHoliday = season === "liburan_boarding";
    const isOutbreak = season === "wabah_gi_parvo";

    let summary = `Model peramalan AI mendeteksi ${items.filter((i) => i.urgency === "Kritis" || i.urgency === "Tinggi").length} item pasokan medis kritis mendekati ambang batas Reorder Point (ROP). Diperlukan tindakan PO otomatis segera untuk mencegah stockout obat gawat darurat dan cairan infus.`;
    if (isRain) {
      summary = `Pola musiman Pancaroba/Musim Hujan menunjukkan lonjakan laju konsumsi antibiotik (+45%) dan cairan infus Ringer Lactate (+40%). Terdapat 4 item berstatus Kritis dengan sisa stok < 5 hari operasional.`;
    } else if (isHoliday) {
      summary = `Musim liburan memicu kenaikan permintaan vaksinasi inti (Rabies & Felocell) sebesar +65% dan anestesi bedah sterilisasi (+35%). Segera rilis PO ke distributor sebelum cuti logistik nasional.`;
    } else if (isOutbreak) {
      summary = `PERINGATAN WABAH: Konsumsi rapid test kit CPV/CCV dan cairan infus melonjak hingga +120%. Buffer safety stock harus ditingkatkan ke level proteksi 99% untuk menjamin ketersediaan di ICU.`;
    }

    const priorityRankings = [
      {
        sku: "MED-RL-500",
        name: "Ringer Lactate Infusion 500ml",
        priorityReason: `Tingkat okupansi ICU (${inpatients} pasien aktif) dan resusitasi membutuhkan rata-rata 4.8 - 6.5 kolf/hari. Sisa stok hanya mencukupi < 4 hari kerja jika terjadi penambahan pasien dehidrasi berat.`,
        immediateAction: "Terbitkan PO darurat batch 20 kolf ke PharmaVet Nusantara dengan estimasi kedatangan H+3.",
      },
      {
        sku: "MED-ISO-100",
        name: "Isoflurane Inhalation 100ml",
        priorityReason: `Jadwal operasi bedah (${surgeries} tindakan elektif/emergensi) membutuhkan anestesi inhalasi stabil. Sisa stok 2 botol berada di bawah Safety Stock (SS: 3 botol).`,
        immediateAction: "Lakukan pemesanan batch 3 botol ke PT Medika Veteriner Utama untuk mengamankan slot bedah minggu depan.",
      },
      {
        sku: "LAB-RPD-CPV",
        name: "Rapid Test Kit Parvo/Corona Ag",
        priorityReason: "Alat diagnostik skrining lini pertama triase pasien muntah/diare akut di IGD veteriner.",
        immediateAction: "Pesan 10 box rapid test kit untuk mengantisipasi potensi penularan klaster musim pancaroba.",
      },
      {
        sku: "VAC-RAB-01",
        name: "Vaksin Rabies Defensor 3",
        priorityReason: "Vaksinasi regulasi wajib zoonosis. Stok 8 vial mendekati ambang batas ROP (12 vial).",
        immediateAction: "Order 25 vial batch vaksin bergaransi rantai dingin (cold chain 2-8°C).",
      },
    ];

    const epidemiologicalRiskFactors = [
      "Tingginya kelembaban udara (>80%) memicu lonjakan kasus Dermatitis Malassezia dan Pyoderma sekunder sebesar +38%.",
      "Fluktuasi suhu pancaroba memicu penurunan imunitas mukosa saluran cerna, meningkatkan risiko gastroenteritis viral (CPV/FPV).",
      "Peningkatan okupansi rawat inap ICU membutuhkan suplai kateter IV dan spuit disposabel dengan laju perputaran tinggi.",
      "Kepadatan reservasi Pet Hotel mewajibkan sertifikat vaksinasi Rabies & FVRCP aktif, menaikkan serapan vaksinasi walk-in.",
    ];

    const supplierOptimizationAdvice = [
      "Konsolidasi pemesanan obat resep dan cairan infus ke satu distributor utama (PharmaVet) untuk mendapatkan diskon volume 5-8% dan gratis ongkir express.",
      "Terapkan SLA Lead-Time Maksimal 3 Hari Kerja dengan klausul ganti rugi jika terjadi keterlambatan pasokan obat esensial ICU.",
      "Pertahankan safety stock ganda (dual-sourcing) untuk item anestesi (Ketamine & Isoflurane) guna mengantisipasi restriksi kuota pabrikan.",
    ];

    return {
      executiveSummary: summary,
      epidemiologicalRiskFactors,
      clinicalPriorityRankings: priorityRankings,
      supplierOptimizationAdvice,
      budgetImpactAnalysis:
        "Estimasi total investasi pengadaan kembali 4 item kritis adalah Rp 2.450.000, yang melindungi estimasi omzet pelayanan medis & bedah sebesar Rp 18.500.000 dari potensi pembatalan tindakan akibat kekosongan obat.",
      preparedTimestamp: new Date().toISOString(),
    };
  }

  // Gemini AI-Driven Purchase Order Quantity Suggestion Endpoint (Based on 30-day stock depletion trends & safety stock levels)
  app.post("/api/ai/suggest-po-quantities", requireSession, async (req, res) => {
    try {
      const {
        items = [],
        targetCoverageDays = 25,
        serviceLevelPercent = 95,
        warehouseName = "Gudang Utama & Apotek",
      } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          success: true,
          source: "fallback",
          data: generateFallbackPoSuggestions(items, targetCoverageDays, serviceLevelPercent),
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemPrompt = `
You are an expert Chief Veterinary Pharmacist & Supply Chain Procurement Strategist.
Your task is to analyze 30-day stock depletion rates, current safety stock thresholds, supplier lead times, and cycle stock replenishment needs for an animal hospital.
Provide concise, authoritative guidance on purchase order quantities, supplier consolidation, and clinical risk mitigation.

Respond ONLY with valid JSON conforming to this schema:
{
  "executiveAdvice": "string",
  "recommendedPurchaseOrders": [
    {
      "sku": "string",
      "name": "string",
      "suggestedQty": 0,
      "urgency": "string",
      "reasoning": "string",
      "clinicalRiskIfDelayed": "string"
    }
  ],
  "supplierConsolidationAdvice": "string",
  "cashFlowImpactAnalysis": "string",
  "confidenceScore": 95
}
`;

      const promptContent = `
Current Inventory Status & 30-Day Depletion Trend Data:
- Target Coverage Cycle: ${targetCoverageDays} days
- Target Safety Stock Service Level: ${serviceLevelPercent}%
- Target Warehouse: ${warehouseName}
- Items with Active Depletion / Reorder Triggers:
${JSON.stringify(items.slice(0, 12), null, 2)}

Analyze the 30-day depletion rates, safety stock deficits, and recommend optimized purchase order quantities and procurement strategies.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: promptContent,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const responseText = response.text || "{}";
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (pErr) {
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          parsedData = JSON.parse(match[0]);
        } else {
          parsedData = generateFallbackPoSuggestions(items, targetCoverageDays, serviceLevelPercent);
        }
      }

      return res.json({
        success: true,
        source: "gemini-3.7-flash",
        data: parsedData,
      });
    } catch (err: any) {
      console.error("AI PO Suggestion Error:", err);
      const { items = [], targetCoverageDays = 25, serviceLevelPercent = 95 } = req.body;
      return res.json({
        success: true,
        source: "fallback_recovery",
        data: generateFallbackPoSuggestions(items, targetCoverageDays, serviceLevelPercent),
      });
    }
  });

  function generateFallbackPoSuggestions(
    items: any[],
    targetCoverageDays: number,
    serviceLevel: number
  ) {
    const criticalItems = items.filter((i) => i.urgency === "Kritis" || i.currentStock <= i.safetyStock);
    const urgentItems = items.filter((i) => i.urgency === "Tinggi" || (i.currentStock <= i.reorderPoint && i.currentStock > i.safetyStock));

    const recommendations = items.slice(0, 8).map((item) => {
      const deficit = Math.max(0, (item.safetyStock || item.minStock || 5) - (item.currentStock || 0));
      const burn = item.avgDailyBurn || 1.0;
      const coverageQty = Math.round(burn * targetCoverageDays);
      const suggested = Math.max(5, Math.ceil((deficit + coverageQty) / 5) * 5);

      let urgency = item.urgency || "Waspada";
      let risk = "Operasional rawat inap dan dispensing obat resep berpotensi terganggu jika pengiriman terlambat lebih dari 48 jam.";
      if (item.currentStock <= (item.safetyStock || item.minStock)) {
        urgency = "Kritis";
        risk = "Pasokan obat darurat/esensial berada di bawah ambang pengaman; risiko stockout fatal pada tindakan kritis.";
      }

      return {
        sku: item.sku,
        name: item.name,
        suggestedQty: item.suggestedPoQty || suggested,
        urgency,
        reasoning: `Konsumsi rata-rata 30 hari adalah ${burn} unit/hari. Dengan sisa stok ${item.currentStock} unit dan safety stock ${item.safetyStock || item.minStock} unit, kuantitas ${item.suggestedPoQty || suggested} unit menjamin ketersediaan ${targetCoverageDays} hari pasokan (service level ${serviceLevel}%).`,
        clinicalRiskIfDelayed: risk,
      };
    });

    return {
      executiveAdvice: `Sistem AI menganalisis laju penurunan stok 30 hari dan mengidentifikasi ${criticalItems.length} item berada di bawah safety stock serta ${urgentItems.length} item mencapai Reorder Point (ROP). Diperlukan penerbitan PO segera untuk ${recommendations.length} item guna memulihkan cadangan penyangga operasional 25 hari ke depan.`,
      recommendedPurchaseOrders: recommendations,
      supplierConsolidationAdvice:
        "Kelompokkan pesanan farmasi ke PharmaVet Nusantara dan makanan hewan ke PT Pet Indo Raya untuk mencapai batas minimum free-ongkir dan diskon pembelian grosir volume 4-7%.",
      cashFlowImpactAnalysis:
        "Pengadaan terkonsolidasi ini menstabilkan siklus perputaran persediaan (Inventory Turnover) tanpa mengikat modal kerja berlebih pada barang berkategori pergerakan lambat.",
      confidenceScore: 96,
    };
  }

  // Gemini AI-Driven Dashboard Layout Optimization Assistant Endpoint
  app.post("/api/ai/optimize-layout", requireSession, async (req, res) => {
    try {
      const {
        userRole = "dokter",
        userName = "Staf Medis",
        clickTelemetry = {},
        currentLayoutMode = "tab_priority",
        timeOfDay = "regular",
        clinicLoad = { waitingQueues: 3, inpatients: 2 }
      } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          success: true,
          source: "fallback",
          data: generateFallbackLayoutOptimization(userRole, clickTelemetry, currentLayoutMode, clinicLoad)
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemPrompt = `
You are an expert AI Human-Computer Interaction (HCI) Specialist & Veterinary Hospital Ergonomics Optimizer.
Your task is to analyze a veterinary staff member's role (Dokter Hewan, Paramedik, Resepsionis/Kasir, Pet Hotel Supervisor, Admin), their historical click telemetry patterns on 3 key dashboard widgets ('kalkulator' for Plumb's Vet Drug Dose Calculator, 'cctv' for 4-Channel Surveillance Feeds & Telemetry, 'queueTv' for Real-Time Waiting Room Queue & Voice Calling), and current clinic workload to generate the mathematically most efficient, cognitive-load-reducing dashboard layout.

Layout Modes available:
1. 'split_hero': 1 primary large hero widget (65% width) + 2 synchronized stacked widgets on the side (35% width). Best for clinicians who need deep focus on one tool while monitoring others.
2. 'tab_priority': Clean single-widget tab container with optimized tab ordering and auto-selected default active tab. Best for focused, sequential tasks.
3. 'grid_trio': All 3 widgets displayed simultaneously in a responsive 3-column command center grid. Best for multi-tasking managers, supervisors, or busy shifts.
4. 'dual_split': 2 prioritized widgets side-by-side (50/50). Best for nurses monitoring CCTV ICU + Calculating Doses, or receptionists monitoring Queue + CCTV.

Widget IDs strictly: 'kalkulator', 'cctv', 'queueTv'.

Respond ONLY with valid JSON conforming to this schema:
{
  "recommendedMode": "split_hero",
  "primaryWidget": "kalkulator",
  "widgetOrder": ["kalkulator", "queueTv", "cctv"],
  "headline": "string",
  "reasoning": "string",
  "efficiencyGainPercent": 38,
  "clicksSavedPerShift": 24,
  "behaviorInsights": ["string"],
  "ergonomicRecommendations": ["string"],
  "suggestedPresets": [
    {
      "id": "string",
      "title": "string",
      "mode": "split_hero",
      "order": ["kalkulator", "queueTv", "cctv"]
    }
  ]
}
`;

      const promptContent = `
Current User Profile & Telemetry:
- User Name: ${userName}
- User Role: ${userRole}
- Current Layout Mode: ${currentLayoutMode}
- Time of Day Context: ${timeOfDay}
- Clinic Workload: ${clinicLoad.waitingQueues} antrian menunggu, ${clinicLoad.inpatients} pasien rawat inap
- Historical Click Telemetry (Last 7 Days):
${JSON.stringify(clickTelemetry, null, 2)}

Please determine the optimal widget ordering, primary focus tool, layout mode, and ergonomic reasoning.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: promptContent,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const responseText = response.text || "{}";
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (pErr) {
        console.warn("Could not parse Gemini layout optimization response directly:", pErr);
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          parsedData = JSON.parse(match[0]);
        } else {
          parsedData = generateFallbackLayoutOptimization(userRole, clickTelemetry, currentLayoutMode, clinicLoad);
        }
      }

      return res.json({
        success: true,
        source: "gemini-3.7-flash",
        data: parsedData,
      });
    } catch (err: any) {
      console.error("AI Layout Optimization Error:", err);
      const {
        userRole = "dokter",
        clickTelemetry = {},
        currentLayoutMode = "tab_priority",
        clinicLoad = { waitingQueues: 3, inpatients: 2 }
      } = req.body;

      return res.json({
        success: true,
        source: "fallback_recovery",
        data: generateFallbackLayoutOptimization(userRole, clickTelemetry, currentLayoutMode, clinicLoad),
      });
    }
  });

  function generateFallbackLayoutOptimization(
    role: string,
    telemetry: any = {},
    _currentMode: string = "tab_priority",
    clinicLoad: any = { waitingQueues: 3, inpatients: 2 }
  ) {
    const calcClicks = telemetry?.kalkulator?.clicks || 0;
    const cctvClicks = telemetry?.cctv?.clicks || 0;
    const queueClicks = telemetry?.queueTv?.clicks || 0;

    const roleLower = (role || "").toLowerCase();
    const isDoctor = roleLower.includes("dokter");
    const isNurse = roleLower.includes("perawat") || roleLower.includes("paramedik");
    const isReceptionist = roleLower.includes("resepsionis") || roleLower.includes("kasir") || roleLower.includes("front");
    const isHotelStaff = roleLower.includes("groomer") || roleLower.includes("hotel") || roleLower.includes("pemilik");

    let recommendedMode: "split_hero" | "tab_priority" | "grid_trio" | "dual_split" = "split_hero";
    let primaryWidget = "kalkulator";
    let widgetOrder = ["kalkulator", "queueTv", "cctv"];
    let headline = "Tata Letak Optimal: Preskripsi & Konsultasi Klinis";
    let reasoning = "Sebagai Dokter Hewan, sebagian besar alur kerja Anda berpusat pada kalkulasi dosis terapeutik Plumb's Vet dan pemanggilan nomor antrian poli periksa.";
    let efficiencyGain = 38;
    let clicksSaved = 22;

    if (isDoctor) {
      if (calcClicks >= queueClicks && calcClicks >= cctvClicks) {
        recommendedMode = "split_hero";
        primaryWidget = "kalkulator";
        widgetOrder = ["kalkulator", "queueTv", "cctv"];
        headline = "Tata Letak Optimal: Konsultasi Poli & Preskripsi Obat";
        reasoning = `Berdasarkan pola historis (${calcClicks} aksi kalkulasi obat), mode Split-Hero memprioritaskan Kalkulator Dosis di sisi utama sembari tetap memantau antrian ruang tunggu (${clinicLoad.waitingQueues || 3} antrian).`;
        efficiencyGain = 42;
        clicksSaved = 28;
      } else {
        recommendedMode = "tab_priority";
        primaryWidget = "kalkulator";
        widgetOrder = ["kalkulator", "queueTv", "cctv"];
        headline = "Tata Letak Optimal: Tab Terfokus Poli Medis";
        reasoning = "Prioritas tab kalkulator dosis dan antrian poli dioptimalkan untuk meminimalkan beban kognitif selama sesi pemeriksaan fisik pasien.";
        efficiencyGain = 30;
        clicksSaved = 16;
      }
    } else if (isNurse) {
      recommendedMode = "dual_split";
      primaryWidget = "cctv";
      widgetOrder = ["cctv", "kalkulator", "queueTv"];
      headline = "Tata Letak Optimal: Pemantauan Rawat Inap & ICU";
      reasoning = `Peran Paramedik/Perawat Hewan membutuhkan pengawasan visual pasien rawat inap (${clinicLoad.inpatients || 2} pasien aktif) dan perhitungan cepat laju infus/sediaan injeksi.`;
      efficiencyGain = 45;
      clicksSaved = 32;
    } else if (isReceptionist) {
      recommendedMode = "split_hero";
      primaryWidget = "queueTv";
      widgetOrder = ["queueTv", "cctv", "kalkulator"];
      headline = "Tata Letak Optimal: Resepsionis & Manajemen Antrian TV";
      reasoning = `Aktivitas Front Desk terfokus pada pemanggilan antrian digital (Audio Chime) dan pemantauan visual area lobi & pet hotel (${queueClicks} interaksi antrian tercatat).`;
      efficiencyGain = 40;
      clicksSaved = 26;
    } else if (isHotelStaff) {
      recommendedMode = "split_hero";
      primaryWidget = "cctv";
      widgetOrder = ["cctv", "queueTv", "kalkulator"];
      headline = "Tata Letak Optimal: Surveillance Pet Hotel & Salon";
      reasoning = "Fokus visual pada pemantauan kamera suite hotel (R01-R04) dan telemetri suhu/kelembaban untuk kenyamanan hewan titipan.";
      efficiencyGain = 35;
      clicksSaved = 20;
    } else {
      // Admin / Owner
      recommendedMode = "grid_trio";
      primaryWidget = "kalkulator";
      widgetOrder = ["kalkulator", "cctv", "queueTv"];
      headline = "Tata Letak Optimal: Pusat Komando Tri-Widget Serentak";
      reasoning = "Tampilan Command Center menampilkan ketiga modul utilitas operasional secara simultan untuk visibilitas manajerial menyeluruh.";
      efficiencyGain = 25;
      clicksSaved = 15;
    }

    const behaviorInsights = [
      `Distribusi Aktivitas Widget: Kalkulator (${calcClicks} klik), CCTV (${cctvClicks} klik), Antrian TV (${queueClicks} klik).`,
      `Peran Teridentifikasi: ${role.replace("_", " ").toUpperCase()} dengan preferensi akses cepat ke modul utama.`,
      `Beban Kerja Saat Ini: ${clinicLoad.waitingQueues || 0} pasien antrian poli, ${clinicLoad.inpatients || 0} pasien rawat inap ICU.`
    ];

    const ergonomicRecommendations = [
      `Tempatkan ${primaryWidget === "kalkulator" ? "Kalkulator Dosis" : primaryWidget === "cctv" ? "CCTV Monitor" : "Layar Antrian TV"} sebagai widget utama untuk memangkas waktu navigasi.`,
      "Manfaatkan layout multi-view untuk menghilangkan perpindahan tab berulang saat jam sibuk klinik.",
      "Gunakan shortcut pemanggilan audio antrian instan langsung dari header widget."
    ];

    const suggestedPresets = [
      {
        id: "doctor_clinical",
        title: "🩺 Poli Klinis & Resep Medis",
        mode: "split_hero" as const,
        order: ["kalkulator", "queueTv", "cctv"]
      },
      {
        id: "nurse_inpatient",
        title: "🏥 Paramedik & Rawat Inap ICU",
        mode: "dual_split" as const,
        order: ["cctv", "kalkulator", "queueTv"]
      },
      {
        id: "frontdesk_queue",
        title: "🛎️ Front Desk & Antrian TV",
        mode: "split_hero" as const,
        order: ["queueTv", "cctv", "kalkulator"]
      },
      {
        id: "trio_command",
        title: "⚡ Pusat Komando Tri-Widget (Grid)",
        mode: "grid_trio" as const,
        order: ["kalkulator", "cctv", "queueTv"]
      }
    ];

    return {
      recommendedMode,
      primaryWidget,
      widgetOrder,
      headline,
      reasoning,
      efficiencyGainPercent: efficiencyGain,
      clicksSavedPerShift: clicksSaved,
      behaviorInsights,
      ergonomicRecommendations,
      suggestedPresets,
      preparedAt: new Date().toISOString()
    };
  }

  // Reset Queue / Daily Cron endpoint simulation
  app.post("/api/cron/reset-queue", requireRole("admin", "superadmin"), (_req, res) => {
    res.json({ success: true, message: "Queue reset successfully" });
  });

  // Vite middleware for dev or static server for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PetCare ERP] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
