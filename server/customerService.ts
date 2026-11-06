import { pool, withTransaction } from "./db";

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
  const { rows } = await pool.query("SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 500");
  return rows.map(toCustomer);
}

export async function createCustomer(input: { name: string; phone: string; email?: string; address?: string; nik?: string; gender?: string; membershipTier?: string }) {
  if (!input.name?.trim()) throw new Error("Nama pelanggan wajib diisi.");
  if (!input.phone?.trim()) throw new Error("Nomor telepon pelanggan wajib diisi.");
  const { rows } = await pool.query(
    `INSERT INTO customers (name, phone, email, address, nik, gender, membership_tier)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.name, input.phone, input.email ?? null, input.address ?? null, input.nik ?? null, input.gender ?? null, input.membershipTier || "Silver"]
  );
  return toCustomer(rows[0]);
}

export async function updateCustomer(id: string, patch: Record<string, any>) {
  const { rows: currentRows } = await pool.query("SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL", [id]);
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
     WHERE id = $11 AND deleted_at IS NULL RETURNING *`,
    [next.name, next.phone, next.email, next.address, next.nik, next.gender, next.membership_tier, next.loyalty_points, next.total_spent, next.pet_count, id]
  );
  return toCustomer(rows[0]);
}

export async function deleteCustomer(id: string) {
  const now = new Date();
  await pool.query("UPDATE pets SET deleted_at = $1 WHERE customer_id = $2 AND deleted_at IS NULL", [now, id]);
  await pool.query("UPDATE customers SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL", [now, id]);
}

export async function adjustCustomerPoints(customerId: string, amount: number) {
  const { rows } = await pool.query(
    "UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points + $1) WHERE id = $2 AND deleted_at IS NULL RETURNING *",
    [amount, customerId]
  );
  if (!rows[0]) throw new Error("Pelanggan tidak ditemukan.");
  return toCustomer(rows[0]);
}

const TIER_RANK: Record<string, number> = { Regular: 1, Silver: 2, Gold: 3, Platinum: 4 };

export async function mergeCustomers(primaryId: string, duplicateIds: string[]) {
  const cleanDupIds = Array.from(new Set(duplicateIds.filter((id) => id && id !== primaryId)));
  if (!primaryId || cleanDupIds.length === 0) {
    throw new Error("Pilih minimal 1 rekam pelanggan duplikat untuk digabungkan.");
  }

  return withTransaction(async (client) => {
    const { rows: primaryRows } = await client.query(
      "SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL",
      [primaryId]
    );
    const primary = primaryRows[0];
    if (!primary) throw new Error("Data pelanggan utama tidak ditemukan.");

    const { rows: dupRows } = await client.query(
      "SELECT * FROM customers WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL",
      [cleanDupIds]
    );
    if (dupRows.length === 0) {
      return toCustomer(primary);
    }

    let mergedEmail = primary.email || "";
    let mergedAddress = primary.address || "";
    let mergedNik = primary.nik || null;
    let mergedGender = primary.gender || null;
    let mergedTier = primary.membership_tier || "Silver";
    let mergedPoints = Number(primary.loyalty_points || 0);
    let mergedSpent = Number(primary.total_spent || 0);

    for (const d of dupRows) {
      if (!mergedEmail && d.email) mergedEmail = d.email;
      if (!mergedAddress && d.address) mergedAddress = d.address;
      if (!mergedNik && d.nik) mergedNik = d.nik;
      if (!mergedGender && d.gender) mergedGender = d.gender;
      if ((TIER_RANK[d.membership_tier] || 0) > (TIER_RANK[mergedTier] || 0)) {
        mergedTier = d.membership_tier;
      }
      mergedPoints += Number(d.loyalty_points || 0);
      mergedSpent += Number(d.total_spent || 0);
    }

    // Re-assign all related child records from duplicates to primary customer
    await client.query(
      "UPDATE pets SET customer_id = $1 WHERE customer_id = ANY($2::uuid[]) AND deleted_at IS NULL",
      [primaryId, cleanDupIds]
    );
    await client.query(
      "UPDATE clinic_visits SET customer_id = $1, customer_name = $2 WHERE customer_id = ANY($3::uuid[])",
      [primaryId, primary.name, cleanDupIds]
    );
    await client.query(
      "UPDATE invoices SET customer_id = $1, customer_name = $2 WHERE customer_id = ANY($3::uuid[])",
      [primaryId, primary.name, cleanDupIds]
    );
    await client.query(
      "UPDATE doc_bookings SET customer_id = $1, customer_name = $2 WHERE customer_id = ANY($3::uuid[])",
      [primaryId, primary.name, cleanDupIds]
    );
    await client.query(
      "UPDATE customer_notes SET customer_id = $1 WHERE customer_id = ANY($2::uuid[])",
      [primaryId, cleanDupIds]
    );
    await client.query(
      "UPDATE loyalty_entries SET customer_id = $1, customer_name = $2 WHERE customer_id = ANY($3::uuid[])",
      [primaryId, primary.name, cleanDupIds]
    );
    await client.query(
      "UPDATE informed_consents SET customer_id = $1, owner_name = $2 WHERE customer_id = ANY($3::uuid[])",
      [primaryId, primary.name, cleanDupIds]
    );
    await client.query(
      "UPDATE telehealth_sessions SET customer_id = $1, customer_name = $2 WHERE customer_id = ANY($3::text[])",
      [primaryId, primary.name, cleanDupIds]
    );

    // Soft-delete duplicate customer records
    await client.query(
      "UPDATE customers SET deleted_at = now() WHERE id = ANY($1::uuid[])",
      [cleanDupIds]
    );

    // Recalculate active pet_count for primary customer
    const { rows: countRows } = await client.query<{ cnt: number }>(
      "SELECT COUNT(*)::int AS cnt FROM pets WHERE customer_id = $1 AND deleted_at IS NULL",
      [primaryId]
    );
    const activePetCount = countRows[0]?.cnt ?? 0;

    const { rows: updatedRows } = await client.query(
      `UPDATE customers
       SET email = $1, address = $2, nik = $3, gender = $4, membership_tier = $5,
           loyalty_points = $6, total_spent = $7, pet_count = $8
       WHERE id = $9 RETURNING *`,
      [
        mergedEmail || null,
        mergedAddress || null,
        mergedNik,
        mergedGender,
        mergedTier,
        mergedPoints,
        mergedSpent,
        activePetCount,
        primaryId,
      ]
    );

    return toCustomer(updatedRows[0]);
  });
}

