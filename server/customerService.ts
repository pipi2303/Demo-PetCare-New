import { pool } from "./db";

function toCustomer(row: any) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? "",
    address: row.address ?? "",
    nik: row.nik ?? undefined,
    gender: row.gender ?? undefined,
    membershipTier: row.membership_tier,
    loyaltyPoints: row.loyalty_points,
    totalSpent: Number(row.total_spent),
    petCount: row.pet_count,
    createdAt: row.created_at.toISOString().substring(0, 10),
  };
}

export async function listCustomers() {
  const { rows } = await pool.query("SELECT * FROM customers ORDER BY created_at DESC LIMIT 500");
  return rows.map(toCustomer);
}

export async function createCustomer(input: { name: string; phone: string; email?: string; address?: string; nik?: string; gender?: string; membershipTier?: string }) {
  const { rows } = await pool.query(
    `INSERT INTO customers (name, phone, email, address, nik, gender, membership_tier)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.name, input.phone, input.email ?? null, input.address ?? null, input.nik ?? null, input.gender ?? null, input.membershipTier || "Silver"]
  );
  return toCustomer(rows[0]);
}

export async function updateCustomer(id: string, patch: Record<string, any>) {
  const { rows: currentRows } = await pool.query("SELECT * FROM customers WHERE id = $1", [id]);
  const current = currentRows[0];
  if (!current) throw new Error("Pelanggan tidak ditemukan.");
  const next = {
    name: patch.name ?? current.name,
    phone: patch.phone ?? current.phone,
    email: patch.email ?? current.email,
    address: patch.address ?? current.address,
    nik: patch.nik ?? current.nik,
    gender: patch.gender ?? current.gender,
    membership_tier: patch.membershipTier ?? current.membership_tier,
    loyalty_points: patch.loyaltyPoints ?? current.loyalty_points,
    total_spent: patch.totalSpent ?? current.total_spent,
    pet_count: patch.petCount ?? current.pet_count,
  };
  const { rows } = await pool.query(
    `UPDATE customers SET name=$1, phone=$2, email=$3, address=$4, nik=$5, gender=$6, membership_tier=$7, loyalty_points=$8, total_spent=$9, pet_count=$10
     WHERE id = $11 RETURNING *`,
    [next.name, next.phone, next.email, next.address, next.nik, next.gender, next.membership_tier, next.loyalty_points, next.total_spent, next.pet_count, id]
  );
  return toCustomer(rows[0]);
}

export async function deleteCustomer(id: string) {
  // pets.customer_id has ON DELETE CASCADE — matches the app-level cascade
  // delete DataContext.tsx used to do manually against localStorage.
  await pool.query("DELETE FROM customers WHERE id = $1", [id]);
}

export async function adjustCustomerPoints(customerId: string, amount: number) {
  const { rows } = await pool.query(
    "UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points + $1) WHERE id = $2 RETURNING *",
    [amount, customerId]
  );
  if (!rows[0]) throw new Error("Pelanggan tidak ditemukan.");
  return toCustomer(rows[0]);
}
