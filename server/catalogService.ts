import { pool } from "./db";

function toService(row: any) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    estimatedDurationMins: row.estimated_duration_mins,
    price: Number(row.price),
    description: row.description ?? undefined,
    isActive: row.is_active,
  };
}

async function generateUniqueCode(prefix: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
    const { rows } = await pool.query("SELECT 1 FROM services WHERE code = $1", [code]);
    if (rows.length === 0) return code;
  }
  throw new Error("Gagal membuat kode layanan unik, coba lagi.");
}

export async function listServices() {
  const { rows } = await pool.query("SELECT * FROM services ORDER BY category ASC, name ASC");
  return rows.map(toService);
}

export async function createService(input: { name: string; category: string; estimatedDurationMins: number; price: number; description?: string; isActive?: boolean }) {
  const code = await generateUniqueCode("SRV");
  const { rows } = await pool.query(
    `INSERT INTO services (code, name, category, estimated_duration_mins, price, description, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [code, input.name, input.category, input.estimatedDurationMins, input.price, input.description ?? null, input.isActive ?? true]
  );
  return toService(rows[0]);
}

export async function updateService(id: string, patch: Record<string, any>) {
  const { rows: currentRows } = await pool.query("SELECT * FROM services WHERE id = $1", [id]);
  const current = currentRows[0];
  if (!current) throw new Error("Layanan tidak ditemukan.");
  const next = {
    name: patch.name ?? current.name,
    category: patch.category ?? current.category,
    estimated_duration_mins: patch.estimatedDurationMins ?? current.estimated_duration_mins,
    price: patch.price ?? current.price,
    description: patch.description ?? current.description,
    is_active: patch.isActive ?? current.is_active,
  };
  const { rows } = await pool.query(
    `UPDATE services SET name=$1, category=$2, estimated_duration_mins=$3, price=$4, description=$5, is_active=$6 WHERE id=$7 RETURNING *`,
    [next.name, next.category, next.estimated_duration_mins, next.price, next.description, next.is_active, id]
  );
  return toService(rows[0]);
}

export async function deleteService(id: string) {
  await pool.query("DELETE FROM services WHERE id = $1", [id]);
}
