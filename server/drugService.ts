import { pool } from "./db";

function toDrug(row: any) {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    category: row.category as string,
    unit: row.unit as string,
    stock: Number(row.stock),
    minStock: Number(row.min_stock),
    unitPrice: Number(row.unit_price),
    batchNumber: row.batch_number as string,
    expiryDate: row.expiry_date instanceof Date
      ? row.expiry_date.toISOString().substring(0, 10)
      : String(row.expiry_date ?? ""),
    location: row.location as string,
  };
}

function nextCode(existing: string[]): string {
  let n = existing.length + 1;
  let code: string;
  do { code = `DRG-${String(n).padStart(3, "0")}`; n++; } while (existing.includes(code));
  return code;
}

export async function listDrugs() {
  const { rows } = await pool.query("SELECT * FROM drugs ORDER BY name");
  return rows.map(toDrug);
}

export async function createDrug(input: {
  name: string; category: string; unit: string; stock: number; minStock: number;
  unitPrice: number; batchNumber?: string; expiryDate?: string; location?: string;
}) {
  if (!input.name?.trim()) throw new Error("Nama obat wajib diisi.");
  if (!input.category?.trim()) throw new Error("Kategori obat wajib diisi.");
  const { rows: existing } = await pool.query("SELECT code FROM drugs");
  const code = nextCode(existing.map((r: any) => r.code));
  const { rows } = await pool.query(
    `INSERT INTO drugs (code, name, category, unit, stock, min_stock, unit_price, batch_number, expiry_date, location)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [code, input.name, input.category, input.unit, input.stock, input.minStock,
     input.unitPrice, input.batchNumber ?? "", input.expiryDate ?? null, input.location ?? ""]
  );
  return toDrug(rows[0]);
}

export async function updateDrug(id: string, patch: Record<string, any>) {
  const { rows: cur } = await pool.query("SELECT * FROM drugs WHERE id=$1", [id]);
  if (!cur[0]) throw new Error("Obat tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    `UPDATE drugs SET name=$1, category=$2, unit=$3, stock=$4, min_stock=$5, unit_price=$6,
       batch_number=$7, expiry_date=$8, location=$9 WHERE id=$10 RETURNING *`,
    [patch.name ?? c.name, patch.category ?? c.category, patch.unit ?? c.unit,
     patch.stock ?? c.stock, patch.minStock ?? c.min_stock, patch.unitPrice ?? c.unit_price,
     patch.batchNumber ?? c.batch_number, patch.expiryDate ?? c.expiry_date,
     patch.location ?? c.location, id]
  );
  return toDrug(rows[0]);
}

export async function deleteDrug(id: string) {
  await pool.query("DELETE FROM drugs WHERE id=$1", [id]);
}

export async function dispenseDrug(id: string, qty: number) {
  const { rows } = await pool.query(
    "UPDATE drugs SET stock = GREATEST(0, stock - $1) WHERE id=$2 RETURNING *",
    [qty, id]
  );
  if (!rows[0]) throw new Error("Obat tidak ditemukan.");
  return toDrug(rows[0]);
}
