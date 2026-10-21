import { pool } from "./db";

const d = (v: any) => v instanceof Date ? v.toISOString().substring(0, 10) : (v ? String(v) : "");

function toPCF(row: any) {
  return {
    id: row.id as string, customerName: row.customer_name as string,
    petName: row.pet_name as string, chiefComplaint: row.chief_complaint as string,
    knownAllergies: row.known_allergies as string, currentMedications: row.current_medications as string,
    homeWeightKg: row.home_weight_kg != null ? Number(row.home_weight_kg) : undefined,
    behaviorNotes: row.behavior_notes as string, status: row.status as string,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString().substring(0, 16) : String(row.created_at),
  };
}

function toRL(row: any) {
  return {
    id: row.id as string, referralNo: row.referral_no as string,
    petName: row.pet_name as string, customerName: row.customer_name as string,
    destinationClinic: row.destination_clinic as string, destinationDoctor: row.destination_doctor as string,
    urgency: row.urgency as string, reason: row.reason as string,
    currentMedications: row.current_medications as string, notes: row.notes as string,
    createdAt: d(row.created_at),
  };
}

function toSurvey(row: any) {
  return {
    id: row.id as string, visitId: (row.visit_id as string) ?? "",
    petName: row.pet_name as string, customerName: row.customer_name as string,
    doctorName: row.doctor_name as string, rating: Number(row.rating),
    comments: row.comments as string, createdAt: d(row.created_at),
  };
}

// ── Pre-Consult Forms ─────────────────────────────────────────────────────────

export async function listPreConsultForms() {
  const { rows } = await pool.query("SELECT * FROM pre_consult_forms ORDER BY created_at DESC LIMIT 1000");
  return rows.map(toPCF);
}

export async function createPreConsultForm(input: {
  customerName: string; petName: string; chiefComplaint?: string; knownAllergies?: string;
  currentMedications?: string; homeWeightKg?: number; behaviorNotes?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO pre_consult_forms (customer_name, pet_name, chief_complaint, known_allergies, current_medications, home_weight_kg, behavior_notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.customerName, input.petName, input.chiefComplaint ?? "", input.knownAllergies ?? "",
     input.currentMedications ?? "", input.homeWeightKg ?? null, input.behaviorNotes ?? ""]
  );
  return toPCF(rows[0]);
}

export async function updatePreConsultStatus(id: string, status: string) {
  const { rows } = await pool.query(
    "UPDATE pre_consult_forms SET status=$1 WHERE id=$2 RETURNING *", [status, id]
  );
  if (!rows[0]) throw new Error("Form tidak ditemukan.");
  return toPCF(rows[0]);
}

// ── Referral Letters ──────────────────────────────────────────────────────────

export async function listReferralLetters() {
  const { rows } = await pool.query("SELECT * FROM referral_letters ORDER BY created_at DESC LIMIT 500");
  return rows.map(toRL);
}

export async function createReferralLetter(input: {
  petName: string; customerName: string; destinationClinic?: string; destinationDoctor?: string;
  urgency?: string; reason?: string; currentMedications?: string; notes?: string;
}) {
  const referralNo = "REF-" + Date.now().toString().slice(-6);
  const { rows } = await pool.query(
    `INSERT INTO referral_letters (referral_no, pet_name, customer_name, destination_clinic, destination_doctor, urgency, reason, current_medications, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [referralNo, input.petName, input.customerName, input.destinationClinic ?? "",
     input.destinationDoctor ?? "", input.urgency ?? "Rutin",
     input.reason ?? "", input.currentMedications ?? "", input.notes ?? ""]
  );
  return toRL(rows[0]);
}

// ── Visit Surveys ─────────────────────────────────────────────────────────────

export async function listVisitSurveys() {
  const { rows } = await pool.query("SELECT * FROM visit_surveys ORDER BY created_at DESC LIMIT 1000");
  return rows.map(toSurvey);
}

export async function createVisitSurvey(input: {
  visitId?: string; petName: string; customerName: string; doctorName?: string;
  rating: number; comments?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO visit_surveys (visit_id, pet_name, customer_name, doctor_name, rating, comments)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [input.visitId || null, input.petName, input.customerName,
     input.doctorName ?? "", input.rating, input.comments ?? ""]
  );
  return toSurvey(rows[0]);
}
