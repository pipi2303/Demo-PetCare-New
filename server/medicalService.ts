import { pool } from "./db";

const d = (v: any) => v instanceof Date ? v.toISOString().substring(0, 10) : (v ? String(v) : "");
const dt = (v: any) => v instanceof Date ? v.toISOString().replace("T", " ").substring(0, 16) : (v ? String(v) : "");

// ── Medical Records ───────────────────────────────────────────────────────────

function toMR(row: any) {
  return {
    id: row.id as string, petId: (row.pet_id as string) ?? "",
    date: d(row.date), type: row.type as string,
    title: row.title as string, description: row.description as string,
    performedBy: row.performed_by as string,
  };
}

export async function listMedicalRecords() {
  const { rows } = await pool.query("SELECT * FROM medical_records ORDER BY date DESC, created_at DESC LIMIT 2000");
  return rows.map(toMR);
}

export async function createMedicalRecord(input: {
  petId: string; date: string; type: string; title: string; description: string; performedBy: string;
}) {
  const { rows } = await pool.query(
    "INSERT INTO medical_records (pet_id, date, type, title, description, performed_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
    [input.petId, input.date, input.type, input.title, input.description, input.performedBy]
  );
  return toMR(rows[0]);
}

// ── SOAP Notes ────────────────────────────────────────────────────────────────

function toSOAP(row: any) {
  return {
    id: row.id as string,
    visitId: (row.visit_id as string) ?? "",
    petId: (row.pet_id as string) ?? "",
    doctorId: row.doctor_id as string, doctorName: row.doctor_name as string,
    date: d(row.date),
    chiefComplaint: row.chief_complaint as string,
    historyOfPresentIllness: row.history_of_present_illness as string,
    systolicBP: row.systolic_bp != null ? Number(row.systolic_bp) : undefined,
    diastolicBP: row.diastolic_bp != null ? Number(row.diastolic_bp) : undefined,
    heartRate: row.heart_rate != null ? Number(row.heart_rate) : undefined,
    respiratoryRate: row.respiratory_rate != null ? Number(row.respiratory_rate) : undefined,
    temperatureC: row.temperature_c != null ? Number(row.temperature_c) : undefined,
    spO2: row.sp_o2 != null ? Number(row.sp_o2) : undefined,
    weightKg: row.weight_kg != null ? Number(row.weight_kg) : undefined,
    heightCm: row.height_cm != null ? Number(row.height_cm) : undefined,
    physicalExamNotes: row.physical_exam_notes as string,
    workingDiagnosis: row.working_diagnosis as string,
    differentialDiagnosis: row.differential_diagnosis as string,
    severityScore: row.severity_score ?? undefined,
    triageUrgency: row.triage_urgency ?? undefined,
    triageRationale: row.triage_rationale ?? undefined,
    medicationPlan: row.medication_plan as string,
    prescribedDrugs: row.prescribed_drugs ?? [],
    investigationInstructions: row.investigation_instructions as string,
    patientEducation: row.patient_education as string,
    isFinalized: Boolean(row.is_finalized),
  };
}

export async function listSoapNotes() {
  const { rows } = await pool.query("SELECT * FROM soap_notes ORDER BY date DESC, created_at DESC LIMIT 2000");
  return rows.map(toSOAP);
}

export async function upsertSoapNote(input: Omit<ReturnType<typeof toSOAP>, "id">) {
  const { rows } = await pool.query(
    `INSERT INTO soap_notes
       (visit_id, pet_id, doctor_id, doctor_name, date, chief_complaint, history_of_present_illness,
        systolic_bp, diastolic_bp, heart_rate, respiratory_rate, temperature_c, sp_o2,
        weight_kg, height_cm, physical_exam_notes, working_diagnosis, differential_diagnosis,
        severity_score, triage_urgency, triage_rationale, medication_plan, prescribed_drugs,
        investigation_instructions, patient_education, is_finalized)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
     ON CONFLICT (visit_id) DO UPDATE SET
       pet_id=$2, doctor_id=$3, doctor_name=$4, date=$5, chief_complaint=$6,
       history_of_present_illness=$7, systolic_bp=$8, diastolic_bp=$9, heart_rate=$10,
       respiratory_rate=$11, temperature_c=$12, sp_o2=$13, weight_kg=$14, height_cm=$15,
       physical_exam_notes=$16, working_diagnosis=$17, differential_diagnosis=$18,
       severity_score=$19, triage_urgency=$20, triage_rationale=$21, medication_plan=$22,
       prescribed_drugs=$23, investigation_instructions=$24, patient_education=$25, is_finalized=$26
     RETURNING *`,
    [
      input.visitId || null, input.petId || null, input.doctorId, input.doctorName, input.date,
      input.chiefComplaint, input.historyOfPresentIllness,
      input.systolicBP ?? null, input.diastolicBP ?? null, input.heartRate ?? null,
      input.respiratoryRate ?? null, input.temperatureC ?? null, input.spO2 ?? null,
      input.weightKg ?? null, input.heightCm ?? null,
      input.physicalExamNotes, input.workingDiagnosis, input.differentialDiagnosis,
      input.severityScore ?? null, input.triageUrgency ?? null, input.triageRationale ?? null,
      input.medicationPlan, JSON.stringify(input.prescribedDrugs ?? []),
      input.investigationInstructions, input.patientEducation, input.isFinalized ?? false,
    ]
  );
  return toSOAP(rows[0]);
}

// ── Inpatients ────────────────────────────────────────────────────────────────

function toInpatient(row: any) {
  return {
    id: row.id as string, inpatientNo: row.inpatient_no as string,
    petId: (row.pet_id as string) ?? "", petName: row.pet_name as string,
    customerName: row.customer_name as string, cageNo: row.cage_no as string,
    doctorId: row.doctor_id as string, doctorName: row.doctor_name as string,
    diagnosis: row.diagnosis as string, dietInstructions: row.diet_instructions as string,
    status: row.status as string,
    admittedAt: dt(row.admitted_at),
    dischargedAt: row.discharged_at ? dt(row.discharged_at) : undefined,
  };
}

export async function listInpatients() {
  const { rows } = await pool.query("SELECT * FROM inpatients ORDER BY admitted_at DESC LIMIT 500");
  return rows.map(toInpatient);
}

export async function createInpatient(input: {
  petId?: string; petName: string; customerName: string; cageNo: string;
  doctorId?: string; doctorName: string; diagnosis: string; dietInstructions?: string;
}) {
  const inpatientNo = "INP-" + Date.now().toString().slice(-6);
  const { rows } = await pool.query(
    `INSERT INTO inpatients (inpatient_no, pet_id, pet_name, customer_name, cage_no, doctor_id, doctor_name, diagnosis, diet_instructions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [inpatientNo, input.petId || null, input.petName, input.customerName, input.cageNo,
     input.doctorId ?? "", input.doctorName, input.diagnosis, input.dietInstructions ?? ""]
  );
  return toInpatient(rows[0]);
}

export async function updateInpatientStatus(id: string, status: string) {
  const patch: Record<string, any> = { status };
  if (status === "Pulang") patch.discharged_at = new Date();
  const setClauses = ["status=$1"];
  const values: any[] = [status];
  if (patch.discharged_at) { setClauses.push(`discharged_at=$${values.length + 1}`); values.push(patch.discharged_at); }
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE inpatients SET ${setClauses.join(", ")} WHERE id=$${values.length} RETURNING *`,
    values
  );
  if (!rows[0]) throw new Error("Pasien rawat inap tidak ditemukan.");
  return toInpatient(rows[0]);
}

// ── Discharge Notes ───────────────────────────────────────────────────────────

function toDN(row: any) {
  return {
    id: row.id as string, visitId: (row.visit_id as string) ?? "",
    petId: (row.pet_id as string) ?? "", petName: row.pet_name as string,
    customerName: row.customer_name as string, finalDiagnosis: row.final_diagnosis as string,
    homeMedications: row.home_medications as string, homeCareInstructions: row.home_care_instructions as string,
    restrictions: row.restrictions as string, warningSigns: row.warning_signs as string,
    followUpDate: d(row.follow_up_date),
    createdAt: d(row.created_at),
  };
}

export async function listDischargeNotes() {
  const { rows } = await pool.query("SELECT * FROM discharge_notes ORDER BY created_at DESC LIMIT 1000");
  return rows.map(toDN);
}

export async function createDischargeNote(input: {
  visitId?: string; petId?: string; petName: string; customerName: string;
  finalDiagnosis: string; homeMedications: string; homeCareInstructions: string;
  restrictions: string; warningSigns: string; followUpDate?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO discharge_notes
       (visit_id, pet_id, pet_name, customer_name, final_diagnosis, home_medications,
        home_care_instructions, restrictions, warning_signs, follow_up_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [input.visitId || null, input.petId || null, input.petName, input.customerName,
     input.finalDiagnosis, input.homeMedications, input.homeCareInstructions,
     input.restrictions, input.warningSigns, input.followUpDate || null]
  );
  return toDN(rows[0]);
}

// ── Lab Tests ─────────────────────────────────────────────────────────────────

function toLab(row: any) {
  return {
    id: row.id as string, testNo: row.test_no as string,
    petId: (row.pet_id as string) ?? "", petName: row.pet_name as string,
    customerName: row.customer_name as string, testName: row.test_name as string,
    status: row.status as string, orderedBy: row.ordered_by as string,
    orderedAt: dt(row.ordered_at),
    completedAt: row.completed_at ? dt(row.completed_at) : undefined,
    results: row.results ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export async function listLabTests() {
  const { rows } = await pool.query("SELECT * FROM lab_tests ORDER BY ordered_at DESC LIMIT 1000");
  return rows.map(toLab);
}

export async function createLabTest(input: {
  petId?: string; petName: string; customerName: string; testName: string; orderedBy: string;
}) {
  const testNo = "LAB-" + Date.now().toString().slice(-6);
  const { rows } = await pool.query(
    `INSERT INTO lab_tests (test_no, pet_id, pet_name, customer_name, test_name, ordered_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [testNo, input.petId || null, input.petName, input.customerName, input.testName, input.orderedBy]
  );
  return toLab(rows[0]);
}

export async function updateLabResult(id: string, results: any[], notes?: string) {
  const { rows } = await pool.query(
    `UPDATE lab_tests SET status='Selesai', completed_at=NOW(), results=$1, notes=COALESCE($2, notes)
     WHERE id=$3 RETURNING *`,
    [JSON.stringify(results), notes ?? null, id]
  );
  if (!rows[0]) throw new Error("Lab test tidak ditemukan.");
  return toLab(rows[0]);
}

// ── Surgical Procedures ───────────────────────────────────────────────────────

function toSurg(row: any) {
  return {
    id: row.id as string, procedureNo: row.procedure_no as string,
    petId: (row.pet_id as string) ?? "", petName: row.pet_name as string,
    customerName: row.customer_name as string, procedureName: row.procedure_name as string,
    category: row.category as string, date: d(row.date),
    startTime: row.start_time ?? undefined, endTime: row.end_time ?? undefined,
    leadSurgeon: row.lead_surgeon as string, assistantSurgeon: row.assistant_surgeon ?? undefined,
    anesthetist: row.anesthetist as string, anesthesiaProtocol: row.anesthesia_protocol as string,
    asaScore: row.asa_score ?? undefined, status: row.status as string,
    findings: row.findings ?? undefined, postOpNotes: row.post_op_notes ?? undefined,
    sutureRemovalDate: row.suture_removal_date ? d(row.suture_removal_date) : undefined,
    complications: row.complications ?? undefined, photoUrl: row.photo_url ?? undefined,
  };
}

export async function listSurgicalProcedures() {
  const { rows } = await pool.query("SELECT * FROM surgical_procedures ORDER BY date DESC LIMIT 500");
  return rows.map(toSurg);
}

export async function createSurgicalProcedure(input: {
  petId?: string; petName: string; customerName: string; procedureName: string;
  category: string; date: string; startTime?: string; endTime?: string; leadSurgeon: string;
  assistantSurgeon?: string; anesthetist: string; anesthesiaProtocol: string;
  asaScore?: string; status?: string; findings?: string; postOpNotes?: string;
  sutureRemovalDate?: string; complications?: string; photoUrl?: string;
}) {
  const procedureNo = "SURG-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(10 + Math.random() * 90);
  const { rows } = await pool.query(
    `INSERT INTO surgical_procedures
       (procedure_no, pet_id, pet_name, customer_name, procedure_name, category, date,
        start_time, end_time, lead_surgeon, assistant_surgeon, anesthetist, anesthesia_protocol,
        asa_score, status, findings, post_op_notes, suture_removal_date, complications, photo_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
    [procedureNo, input.petId || null, input.petName, input.customerName, input.procedureName,
     input.category, input.date, input.startTime ?? null, input.endTime ?? null,
     input.leadSurgeon, input.assistantSurgeon ?? null, input.anesthetist, input.anesthesiaProtocol,
     input.asaScore ?? null, input.status ?? "Selesai", input.findings ?? null,
     input.postOpNotes ?? null, input.sutureRemovalDate ?? null,
     input.complications ?? null, input.photoUrl ?? null]
  );
  return toSurg(rows[0]);
}
