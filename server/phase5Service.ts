// Phase 5: inter_branch_transfers, loyalty_entries, e-forms, informed_consents,
// system_groups, customer_tier_groups, patient_photos, audit_logs GET.
import { pool } from "./db";

const d = (v: any) => v instanceof Date ? v.toISOString().substring(0, 10) : (v ? String(v) : "");
const dt = (v: any) => v instanceof Date ? v.toISOString().replace("T", " ").substring(0, 19) : (v ? String(v) : "");

// ── Inter-Branch Transfers ────────────────────────────────────────────────────

function toTransfer(row: any) {
  return {
    id: row.id as string, transferNo: row.transfer_no as string,
    sourceBranchId: (row.source_branch_id as string) ?? "", sourceBranchName: row.source_branch_name as string,
    destBranchId: (row.dest_branch_id as string) ?? "", destBranchName: row.dest_branch_name as string,
    stockItemId: (row.stock_item_id as string) ?? "", itemName: row.item_name as string,
    qty: Number(row.qty), unit: row.unit as string,
    status: row.status as string, date: d(row.date), requestedBy: row.requested_by as string,
  };
}

export async function listInterBranchTransfers() {
  const { rows } = await pool.query("SELECT * FROM inter_branch_transfers ORDER BY created_at DESC LIMIT 500");
  return rows.map(toTransfer);
}

export async function createInterBranchTransfer(input: {
  transferNo: string; sourceBranchId?: string; sourceBranchName: string;
  destBranchId?: string; destBranchName: string; stockItemId?: string;
  itemName: string; qty: number; unit?: string; requestedBy?: string; date?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO inter_branch_transfers
       (transfer_no, source_branch_id, source_branch_name, dest_branch_id, dest_branch_name,
        stock_item_id, item_name, qty, unit, requested_by, date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [input.transferNo, input.sourceBranchId || null, input.sourceBranchName,
     input.destBranchId || null, input.destBranchName, input.stockItemId || null,
     input.itemName, input.qty, input.unit ?? "", input.requestedBy ?? "",
     input.date ?? new Date().toISOString().substring(0, 10)]
  );
  return toTransfer(rows[0]);
}

export async function markTransferReceived(id: string) {
  const { rows } = await pool.query(
    "UPDATE inter_branch_transfers SET status='Diterima' WHERE id=$1 RETURNING *", [id]
  );
  if (!rows[0]) throw new Error("Transfer tidak ditemukan.");
  return toTransfer(rows[0]);
}

// ── Loyalty Entries ───────────────────────────────────────────────────────────

function toEntry(row: any) {
  return {
    id: row.id as string, customerId: (row.customer_id as string) ?? "",
    customerName: row.customer_name as string, pointsChanged: Number(row.points_changed),
    type: row.type as string, description: row.description as string, date: d(row.date),
  };
}

export async function listLoyaltyEntries() {
  const { rows } = await pool.query("SELECT * FROM loyalty_entries ORDER BY created_at DESC LIMIT 2000");
  return rows.map(toEntry);
}

export async function createLoyaltyEntry(input: {
  customerId: string; customerName: string; pointsChanged: number;
  type: string; description: string; date?: string;
}) {
  const { rows } = await pool.query(
    "INSERT INTO loyalty_entries (customer_id, customer_name, points_changed, type, description, date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
    [input.customerId, input.customerName, input.pointsChanged, input.type,
     input.description, input.date ?? new Date().toISOString().substring(0, 10)]
  );
  return toEntry(rows[0]);
}

// ── E-Form Templates ──────────────────────────────────────────────────────────

function toTpl(row: any) {
  return {
    id: row.id as string, title: row.title as string, category: row.category as string,
    description: row.description as string, fields: row.fields ?? [],
  };
}

export async function listEFormTemplates() {
  const { rows } = await pool.query("SELECT * FROM eform_templates ORDER BY created_at DESC");
  return rows.map(toTpl);
}

export async function createEFormTemplate(input: {
  title: string; category?: string; description?: string; fields?: any[];
}) {
  const { rows } = await pool.query(
    "INSERT INTO eform_templates (title, category, description, fields) VALUES ($1,$2,$3,$4) RETURNING *",
    [input.title, input.category ?? "", input.description ?? "", JSON.stringify(input.fields ?? [])]
  );
  return toTpl(rows[0]);
}

export async function updateEFormTemplate(id: string, patch: Record<string, any>) {
  const { rows: cur } = await pool.query("SELECT * FROM eform_templates WHERE id=$1", [id]);
  if (!cur[0]) throw new Error("Template tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    "UPDATE eform_templates SET title=$1, category=$2, description=$3, fields=$4 WHERE id=$5 RETURNING *",
    [patch.title ?? c.title, patch.category ?? c.category, patch.description ?? c.description,
     JSON.stringify(patch.fields ?? c.fields), id]
  );
  return toTpl(rows[0]);
}

export async function deleteEFormTemplate(id: string) {
  await pool.query("DELETE FROM eform_templates WHERE id=$1", [id]);
}

// ── E-Form Submissions ────────────────────────────────────────────────────────

function toSub(row: any) {
  return {
    id: row.id as string, templateId: (row.template_id as string) ?? "",
    templateTitle: row.template_title as string, petName: row.pet_name as string,
    customerName: row.customer_name as string, date: d(row.date),
    status: row.status as string, fieldValues: row.field_values ?? {},
    signatureData: row.signature_data ?? undefined,
  };
}

export async function listEFormSubmissions() {
  const { rows } = await pool.query("SELECT * FROM eform_submissions ORDER BY created_at DESC LIMIT 500");
  return rows.map(toSub);
}

export async function createEFormSubmission(input: {
  templateId?: string; templateTitle: string; petName: string; customerName: string;
  status?: string; fieldValues?: Record<string, any>; signatureData?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO eform_submissions (template_id, template_title, pet_name, customer_name, status, field_values, signature_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.templateId || null, input.templateTitle, input.petName, input.customerName,
     input.status ?? "Draft", JSON.stringify(input.fieldValues ?? {}), input.signatureData ?? null]
  );
  return toSub(rows[0]);
}

// ── Informed Consents ─────────────────────────────────────────────────────────

function toConsent(row: any) {
  return {
    id: row.id as string, consentNo: row.consent_no as string,
    petId: (row.pet_id as string) ?? "", petName: row.pet_name as string,
    customerId: (row.customer_id as string) ?? "", customerName: row.customer_name as string,
    customerPhone: row.customer_phone ?? undefined, customerNik: row.customer_nik ?? undefined,
    doctorId: row.doctor_id as string, doctorName: row.doctor_name as string,
    procedureType: row.procedure_type as string, diagnosis: row.diagnosis as string,
    procedureDetails: row.procedure_details as string, risksDisclosed: row.risks_disclosed as string,
    estimatedCost: Number(row.estimated_cost),
    signatureDataUrl: row.signature_data_url as string,
    signedAt: dt(row.signed_at), witnessName: row.witness_name as string,
    status: row.status as string, securityHash: row.security_hash ?? undefined,
  };
}

export async function listInformedConsents() {
  const { rows } = await pool.query("SELECT * FROM informed_consents ORDER BY created_at DESC LIMIT 500");
  return rows.map(toConsent);
}

export async function createInformedConsent(input: Record<string, any>) {
  const { rows } = await pool.query(
    `INSERT INTO informed_consents
       (consent_no, pet_id, pet_name, customer_id, customer_name, customer_phone, customer_nik,
        doctor_id, doctor_name, procedure_type, diagnosis, procedure_details, risks_disclosed,
        estimated_cost, signature_data_url, signed_at, witness_name, status, security_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
    [input.consentNo, input.petId || null, input.petName, input.customerId || null,
     input.customerName, input.customerPhone ?? null, input.customerNik ?? null,
     input.doctorId ?? "", input.doctorName ?? "", input.procedureType ?? "",
     input.diagnosis ?? "", input.procedureDetails ?? "", input.risksDisclosed ?? "",
     input.estimatedCost ?? 0, input.signatureDataUrl ?? "",
     input.signedAt ? new Date(input.signedAt) : new Date(),
     input.witnessName ?? "", input.status ?? "Ditandatangani", input.securityHash ?? null]
  );
  return toConsent(rows[0]);
}

// ── System Groups ─────────────────────────────────────────────────────────────

function toGroup(row: any) {
  return {
    id: row.id as string, code: row.code as string, name: row.name as string,
    type: row.type as string, description: row.description as string,
    departmentHead: row.department_head as string,
    allowedRoles: row.allowed_roles ?? [],
    modulePermissions: row.module_permissions ?? [],
    memberCount: Number(row.member_count), color: row.color as string,
    branchId: row.branch_id ?? undefined,
    isSystemDefault: Boolean(row.is_system_default),
    createdAt: d(row.created_at),
  };
}

export async function listSystemGroups() {
  const { rows } = await pool.query("SELECT * FROM system_groups ORDER BY created_at");
  return rows.map(toGroup);
}

export async function createSystemGroup(input: Record<string, any>) {
  const { rows } = await pool.query(
    `INSERT INTO system_groups (code, name, type, description, department_head, allowed_roles, module_permissions, member_count, color, branch_id, is_system_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [input.code, input.name, input.type ?? "", input.description ?? "", input.departmentHead ?? "",
     JSON.stringify(input.allowedRoles ?? []), JSON.stringify(input.modulePermissions ?? []),
     input.memberCount ?? 0, input.color ?? "#6366f1",
     input.branchId || null, input.isSystemDefault ?? false]
  );
  return toGroup(rows[0]);
}

export async function updateSystemGroup(id: string, patch: Record<string, any>) {
  const { rows: cur } = await pool.query("SELECT * FROM system_groups WHERE id=$1", [id]);
  if (!cur[0]) throw new Error("Grup tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    `UPDATE system_groups SET name=$1, type=$2, description=$3, department_head=$4, allowed_roles=$5,
       module_permissions=$6, member_count=$7, color=$8, branch_id=$9 WHERE id=$10 RETURNING *`,
    [patch.name ?? c.name, patch.type ?? c.type, patch.description ?? c.description,
     patch.departmentHead ?? c.department_head,
     JSON.stringify(patch.allowedRoles ?? c.allowed_roles),
     JSON.stringify(patch.modulePermissions ?? c.module_permissions),
     patch.memberCount ?? c.member_count, patch.color ?? c.color,
     patch.branchId ?? c.branch_id, id]
  );
  return toGroup(rows[0]);
}

export async function deleteSystemGroup(id: string) {
  await pool.query("DELETE FROM system_groups WHERE id=$1 AND is_system_default=FALSE", [id]);
}

// ── Customer Tier Groups ──────────────────────────────────────────────────────

function toTier(row: any) {
  return {
    id: row.id as string, tierName: row.tier_name as string, code: row.code as string,
    minSpend: Number(row.min_spend), discountPercent: Number(row.discount_percent),
    perks: row.perks as string, color: row.color as string,
    memberCount: Number(row.member_count), autoUpgrade: Boolean(row.auto_upgrade),
  };
}

export async function listCustomerTierGroups() {
  const { rows } = await pool.query("SELECT * FROM customer_tier_groups ORDER BY min_spend");
  return rows.map(toTier);
}

export async function createCustomerTierGroup(input: Record<string, any>) {
  const { rows } = await pool.query(
    "INSERT INTO customer_tier_groups (tier_name, code, min_spend, discount_percent, perks, color, member_count, auto_upgrade) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [input.tierName, input.code, input.minSpend ?? 0, input.discountPercent ?? 0,
     input.perks ?? "", input.color ?? "#6366f1", input.memberCount ?? 0, input.autoUpgrade ?? true]
  );
  return toTier(rows[0]);
}

export async function updateCustomerTierGroup(id: string, patch: Record<string, any>) {
  const { rows: cur } = await pool.query("SELECT * FROM customer_tier_groups WHERE id=$1", [id]);
  if (!cur[0]) throw new Error("Tier tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    "UPDATE customer_tier_groups SET tier_name=$1, min_spend=$2, discount_percent=$3, perks=$4, color=$5, member_count=$6, auto_upgrade=$7 WHERE id=$8 RETURNING *",
    [patch.tierName ?? c.tier_name, patch.minSpend ?? c.min_spend, patch.discountPercent ?? c.discount_percent,
     patch.perks ?? c.perks, patch.color ?? c.color, patch.memberCount ?? c.member_count,
     patch.autoUpgrade ?? c.auto_upgrade, id]
  );
  return toTier(rows[0]);
}

export async function deleteCustomerTierGroup(id: string) {
  await pool.query("DELETE FROM customer_tier_groups WHERE id=$1", [id]);
}

// ── Patient Photos ────────────────────────────────────────────────────────────

function toPhoto(row: any) {
  return {
    id: row.id as string, petId: (row.pet_id as string) ?? "", petName: row.pet_name as string,
    category: row.category as string, photoUrl: row.photo_url as string,
    caption: row.caption as string,
    takenAt: row.taken_at instanceof Date ? row.taken_at.toISOString().replace("T", " ").substring(0, 16) : String(row.taken_at),
    takenBy: row.taken_by as string,
  };
}

export async function listPatientPhotos() {
  const { rows } = await pool.query("SELECT id, pet_id, pet_name, category, photo_url, caption, taken_at, taken_by FROM patient_photos ORDER BY taken_at DESC LIMIT 1000");
  return rows.map(toPhoto);
}

export async function createPatientPhoto(input: {
  petId?: string; petName: string; category?: string; photoUrl: string; caption?: string; takenBy?: string;
}) {
  const { rows } = await pool.query(
    "INSERT INTO patient_photos (pet_id, pet_name, category, photo_url, caption, taken_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
    [input.petId || null, input.petName, input.category ?? "Lainnya", input.photoUrl, input.caption ?? "", input.takenBy ?? ""]
  );
  return toPhoto(rows[0]);
}

// ── Audit Logs GET ────────────────────────────────────────────────────────────

export async function listAuditLogs(limit = 500) {
  const { rows } = await pool.query(
    "SELECT * FROM audit_logs ORDER BY logged_at DESC LIMIT $1", [limit]
  );
  return rows.map((row) => ({
    id: row.id as string,
    timestamp: dt(row.logged_at),
    userName: row.user_name as string, userRole: row.user_role as string,
    action: row.action as string, module: row.module as string,
    target: row.target as string, details: row.details as string,
    severity: (row.severity || "Info") as string,
    branchId: row.branch_id ?? undefined, branchName: row.branch_name ?? undefined,
    previousValue: row.previous_value ?? undefined, newValue: row.new_value ?? undefined,
  }));
}
