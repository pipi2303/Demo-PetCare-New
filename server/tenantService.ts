import { pool } from "./db";

function toTenant(row: any) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    plan: row.plan,
    status: row.status,
    ownerName: row.owner_name,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at.toISOString().substring(0, 10),
    expiresAt: row.expires_at ? row.expires_at.toISOString().substring(0, 10) : "",
  };
}

function toBranch(row: any) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address,
    phone: row.phone,
    email: row.email,
    isActive: row.is_active,
    isMainBranch: row.is_main_branch,
  };
}

export async function listTenants() {
  const { rows } = await pool.query("SELECT * FROM tenants ORDER BY created_at DESC");
  return rows.map(toTenant);
}

export async function createTenant(input: { name: string; code: string; plan: string; status: string; ownerName: string; phone: string; email: string; expiresAt: string }) {
  const { rows } = await pool.query(
    `INSERT INTO tenants (name, code, plan, status, owner_name, phone, email, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [input.name, input.code, input.plan, input.status, input.ownerName, input.phone, input.email, input.expiresAt || null]
  );
  return toTenant(rows[0]);
}

export async function listBranches() {
  const { rows } = await pool.query("SELECT * FROM branches ORDER BY code ASC");
  return rows.map(toBranch);
}

export async function createBranch(input: { name: string; code: string; address: string; phone: string; email: string; isActive?: boolean; isMainBranch?: boolean }) {
  const { rows } = await pool.query(
    `INSERT INTO branches (name, code, address, phone, email, is_active, is_main_branch)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.name, input.code, input.address, input.phone, input.email, input.isActive ?? true, input.isMainBranch ?? false]
  );
  return toBranch(rows[0]);
}

export async function updateBranch(id: string, patch: Partial<{ name: string; code: string; address: string; phone: string; email: string; isActive: boolean; isMainBranch: boolean }>) {
  const { rows: currentRows } = await pool.query("SELECT * FROM branches WHERE id = $1", [id]);
  if (!currentRows[0]) throw new Error("Cabang tidak ditemukan.");
  const merged = { ...currentRows[0], ...toDbBranchPatch(patch) };
  const { rows } = await pool.query(
    `UPDATE branches SET name=$1, code=$2, address=$3, phone=$4, email=$5, is_active=$6, is_main_branch=$7 WHERE id=$8 RETURNING *`,
    [merged.name, merged.code, merged.address, merged.phone, merged.email, merged.is_active, merged.is_main_branch, id]
  );
  return toBranch(rows[0]);
}

function toDbBranchPatch(patch: Partial<{ name: string; code: string; address: string; phone: string; email: string; isActive: boolean; isMainBranch: boolean }>) {
  const out: Record<string, any> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.code !== undefined) out.code = patch.code;
  if (patch.address !== undefined) out.address = patch.address;
  if (patch.phone !== undefined) out.phone = patch.phone;
  if (patch.email !== undefined) out.email = patch.email;
  if (patch.isActive !== undefined) out.is_active = patch.isActive;
  if (patch.isMainBranch !== undefined) out.is_main_branch = patch.isMainBranch;
  return out;
}

export async function deleteBranch(id: string) {
  const { rows } = await pool.query("SELECT is_main_branch FROM branches WHERE id = $1", [id]);
  if (rows[0]?.is_main_branch) throw new Error("Cabang utama tidak bisa dihapus.");
  await pool.query("DELETE FROM branches WHERE id = $1", [id]);
}

export async function getAppSettings() {
  const { rows } = await pool.query("SELECT settings FROM app_settings ORDER BY updated_at DESC LIMIT 1");
  return rows[0]?.settings ?? null;
}

export async function updateAppSettings(patch: Record<string, any>) {
  const { rows: existing } = await pool.query("SELECT tenant_id, settings FROM app_settings ORDER BY updated_at DESC LIMIT 1");
  if (existing[0]) {
    const merged = { ...existing[0].settings, ...patch };
    const { rows } = await pool.query(
      "UPDATE app_settings SET settings = $1, updated_at = now() WHERE tenant_id = $2 RETURNING settings",
      [JSON.stringify(merged), existing[0].tenant_id]
    );
    return rows[0].settings;
  }
  const { rows: tenantRows } = await pool.query("SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1");
  if (!tenantRows[0]) throw new Error("Belum ada tenant untuk menyimpan pengaturan aplikasi.");
  const { rows } = await pool.query(
    "INSERT INTO app_settings (tenant_id, settings) VALUES ($1, $2) RETURNING settings",
    [tenantRows[0].id, JSON.stringify(patch)]
  );
  return rows[0].settings;
}
