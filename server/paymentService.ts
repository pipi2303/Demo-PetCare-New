// Layanan pembayaran QRIS nyata untuk PetCare ERP, memakai Midtrans Core API.
//
// Selama MIDTRANS_SERVER_KEY belum diisi di .env, createQrisCharge() mengembalikan
// { simulated: true } sehingga frontend tetap bisa fallback ke QR dekoratif lama
// (perilaku sebelum integrasi ini) — fitur tidak pernah rusak walau key belum disiapkan.
//
// CATATAN VERIFIKASI: payload di bawah mengikuti kontrak Midtrans Core API v2
// ("Charge Transaction" untuk payment_type "qris", dan "Get Transaction Status")
// yang terdokumentasi stabil, ditulis dari pengetahuan yang ada tanpa akses internet
// untuk cek ulang dokumentasi live saat kode ini dibuat — mohon cocokkan sekali lagi
// dengan https://docs.midtrans.com sebelum dipakai ke transaksi produksi sungguhan.

import crypto from "crypto";

interface PendingTransaction {
  status: "pending" | "settlement" | "expire" | "cancel" | "deny" | "error";
  grossAmount: string;
  createdAt: number;
}

// order_id -> status kita sendiri, bridging gap karena invoice asli cuma ada di
// localStorage client — server butuh state sementara ini untuk menjawab polling
// & menerima webhook. In-memory saja (mirip pola server/sessionService.ts),
// hilang saat server restart; itu wajar untuk transaksi yang sedang berjalan.
const pendingTransactions = new Map<string, PendingTransaction>();
const PENDING_TTL_MS = 30 * 60 * 1000; // 30 menit

function cleanupExpiredPending() {
  const now = Date.now();
  for (const [orderId, entry] of pendingTransactions.entries()) {
    if (now - entry.createdAt > PENDING_TTL_MS) pendingTransactions.delete(orderId);
  }
}

function isProduction(): boolean {
  return (process.env.MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true";
}

function baseUrl(): string {
  return isProduction() ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

function authHeader(serverKey: string): string {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

export function isPaymentGatewayConfigured(): boolean {
  return !!process.env.MIDTRANS_SERVER_KEY;
}

export interface QrisChargeResult {
  success: boolean;
  simulated: boolean;
  qrImageUrl?: string;
  transactionId?: string;
  expiryTime?: string;
  message?: string;
}

export async function createQrisCharge(
  orderId: string,
  grossAmount: number,
  customerName: string
): Promise<QrisChargeResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey) {
    return {
      success: false,
      simulated: true,
      message: "MIDTRANS_SERVER_KEY belum dikonfigurasi — gunakan QR simulasi sebagai fallback."
    };
  }

  try {
    const response = await fetch(`${baseUrl()}/v2/charge`, {
      method: "POST",
      headers: {
        Authorization: authHeader(serverKey),
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: {
          order_id: orderId,
          gross_amount: Math.round(grossAmount)
        },
        customer_details: { first_name: customerName || "Pelanggan" }
      })
    });

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        simulated: false,
        message: data?.status_message || `Midtrans merespons dengan status HTTP ${response.status}.`
      };
    }

    const qrAction = (data?.actions || []).find((a: any) => a?.name === "generate-qr-code");
    pendingTransactions.set(orderId, {
      status: (data?.transaction_status as PendingTransaction["status"]) || "pending",
      grossAmount: String(data?.gross_amount ?? grossAmount),
      createdAt: Date.now()
    });
    cleanupExpiredPending();

    return {
      success: true,
      simulated: false,
      qrImageUrl: qrAction?.url,
      transactionId: data?.transaction_id,
      expiryTime: data?.expiry_time
    };
  } catch (err: any) {
    return {
      success: false,
      simulated: false,
      message: `Gagal menghubungi Midtrans: ${err?.message || "unknown error"}`
    };
  }
}

export interface PaymentStatusResult {
  status: PendingTransaction["status"] | "not_found";
}

export async function getPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
  const cached = pendingTransactions.get(orderId);

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    return { status: cached?.status || "not_found" };
  }

  try {
    const response = await fetch(`${baseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
      headers: { Authorization: authHeader(serverKey), Accept: "application/json" }
    });
    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { status: cached?.status || "not_found" };
    }

    const status = (data?.transaction_status as PendingTransaction["status"]) || "pending";
    pendingTransactions.set(orderId, {
      status,
      grossAmount: String(data?.gross_amount ?? cached?.grossAmount ?? "0"),
      createdAt: cached?.createdAt || Date.now()
    });
    return { status };
  } catch {
    // Midtrans tidak terjangkau — pakai status terakhir yang kita tahu, kalau ada.
    return { status: cached?.status || "not_found" };
  }
}

/**
 * Verifikasi signature notifikasi webhook Midtrans:
 * sha512(order_id + status_code + gross_amount + ServerKey) harus sama
 * dengan `signature_key` yang dikirim di body notifikasi.
 */
export function verifyWebhookSignature(body: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;

  const expected = crypto
    .createHash("sha512")
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(body.signature_key || "", "hex"));
  } catch {
    return false;
  }
}

export function applyWebhookNotification(body: {
  order_id: string;
  transaction_status: PendingTransaction["status"];
  gross_amount: string;
}) {
  const existing = pendingTransactions.get(body.order_id);
  pendingTransactions.set(body.order_id, {
    status: body.transaction_status,
    grossAmount: body.gross_amount,
    createdAt: existing?.createdAt || Date.now()
  });
}
