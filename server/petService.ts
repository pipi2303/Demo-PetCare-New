import { pool, withTransaction } from "./db";

function toPet(row: any, customerName?: string) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: customerName ?? row.customer_name ?? "",
    name: row.name,
    species: row.species,
    breed: row.breed ?? "",
    color: row.color ?? "",
    gender: row.gender ?? "",
    sterilized: row.sterilized,
    birthDate: row.birth_date ? row.birth_date.toISOString().substring(0, 10) : "",
    weightKg: row.weight_kg !== null ? Number(row.weight_kg) : 0,
    microchipNo: row.microchip_no ?? undefined,
    allergies: row.allergies ?? undefined,
    notes: row.notes ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    createdAt: row.created_at.toISOString().substring(0, 10),
  };
}

const SELECT_WITH_CUSTOMER = `
  SELECT pets.*, customers.name AS customer_name
  FROM pets JOIN customers ON customers.id = pets.customer_id
  WHERE pets.deleted_at IS NULL AND customers.deleted_at IS NULL
`;

export async function listPets() {
  const { rows } = await pool.query(`${SELECT_WITH_CUSTOMER} ORDER BY pets.created_at DESC LIMIT 500`);
  return rows.map((r) => toPet(r));
}

export async function createPet(input: { customerId: string; name: string; species: string; breed?: string; color?: string; gender?: string; sterilized?: boolean; birthDate?: string; weightKg?: number; microchipNo?: string; allergies?: string; notes?: string; photoUrl?: string }) {
  if (!input.customerId?.trim()) throw new Error("ID pelanggan wajib diisi.");
  if (!input.name?.trim()) throw new Error("Nama hewan wajib diisi.");
  if (!input.species?.trim()) throw new Error("Spesies hewan wajib diisi.");
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO pets (customer_id, name, species, breed, color, gender, sterilized, birth_date, weight_kg, microchip_no, allergies, notes, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        input.customerId, input.name, input.species, input.breed ?? null, input.color ?? null, input.gender ?? null,
        input.sterilized ?? false, input.birthDate || null, input.weightKg ?? null, input.microchipNo ?? null,
        input.allergies ?? null, input.notes ?? null, input.photoUrl ?? null,
      ]
    );
    await client.query("UPDATE customers SET pet_count = pet_count + 1 WHERE id = $1", [input.customerId]);
    const { rows: customerRows } = await client.query("SELECT name FROM customers WHERE id = $1", [input.customerId]);
    return toPet(rows[0], customerRows[0]?.name);
  });
}

export async function updatePet(id: string, patch: Record<string, any>) {
  return withTransaction(async (client) => {
    const { rows: currentRows } = await client.query("SELECT * FROM pets WHERE id = $1 AND deleted_at IS NULL", [id]);
    const current = currentRows[0];
    if (!current) throw new Error("Pasien hewan tidak ditemukan.");

    const next = {
      customer_id: patch.customerId ?? current.customer_id,
      name: patch.name ?? current.name,
      species: patch.species ?? current.species,
      breed: patch.breed ?? current.breed,
      color: patch.color ?? current.color,
      gender: patch.gender ?? current.gender,
      sterilized: patch.sterilized ?? current.sterilized,
      birth_date: patch.birthDate ?? current.birth_date,
      weight_kg: patch.weightKg ?? current.weight_kg,
      microchip_no: patch.microchipNo ?? current.microchip_no,
      allergies: patch.allergies ?? current.allergies,
      notes: patch.notes ?? current.notes,
      photo_url: patch.photoUrl ?? current.photo_url,
    };

    const { rows } = await client.query(
      `UPDATE pets SET customer_id=$1, name=$2, species=$3, breed=$4, color=$5, gender=$6, sterilized=$7, birth_date=$8, weight_kg=$9, microchip_no=$10, allergies=$11, notes=$12, photo_url=$13
       WHERE id = $14 AND deleted_at IS NULL RETURNING *`,
      [next.customer_id, next.name, next.species, next.breed, next.color, next.gender, next.sterilized, next.birth_date, next.weight_kg, next.microchip_no, next.allergies, next.notes, next.photo_url, id]
    );

    if (patch.customerId && patch.customerId !== current.customer_id) {
      await client.query("UPDATE customers SET pet_count = GREATEST(0, pet_count - 1) WHERE id = $1", [current.customer_id]);
      await client.query("UPDATE customers SET pet_count = pet_count + 1 WHERE id = $1", [patch.customerId]);
    }

    const { rows: customerRows } = await client.query("SELECT name FROM customers WHERE id = $1", [next.customer_id]);
    return toPet(rows[0], customerRows[0]?.name);
  });
}

export async function deletePet(id: string) {
  return withTransaction(async (client) => {
    const { rows: currentRows } = await client.query("SELECT customer_id FROM pets WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (!currentRows[0]) return;
    await client.query("UPDATE pets SET deleted_at = now() WHERE id = $1", [id]);
    await client.query("UPDATE customers SET pet_count = GREATEST(0, pet_count - 1) WHERE id = $1", [currentRows[0].customer_id]);
  });
}

function consolidateTextList(values: (string | null | undefined)[], ignoreTokens: string[] = []): string | null {
  const ignoreSet = new Set(ignoreTokens.map((t) => t.toLowerCase()));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    if (!raw) continue;
    for (const part of raw.split(/[,;]+/)) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (ignoreSet.has(lower)) continue;
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(trimmed);
      }
    }
  }
  return result.length > 0 ? result.join(", ") : null;
}

export async function mergePets(primaryId: string, duplicateIds: string[]) {
  const cleanDupIds = Array.from(new Set(duplicateIds.filter((id) => id && id !== primaryId)));
  if (!primaryId || cleanDupIds.length === 0) {
    throw new Error("Pilih minimal 1 rekam pasien hewan duplikat untuk digabungkan.");
  }

  return withTransaction(async (client) => {
    const { rows: primaryRows } = await client.query(
      "SELECT * FROM pets WHERE id = $1 AND deleted_at IS NULL",
      [primaryId]
    );
    const primary = primaryRows[0];
    if (!primary) throw new Error("Data pasien hewan utama tidak ditemukan.");

    const { rows: dupRows } = await client.query(
      "SELECT * FROM pets WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL",
      [cleanDupIds]
    );
    if (dupRows.length === 0) {
      const { rows: custRows } = await client.query("SELECT name FROM customers WHERE id = $1", [primary.customer_id]);
      return toPet(primary, custRows[0]?.name);
    }

    const allRows = [primary, ...dupRows];
    const mergedBreed = allRows.find((r) => r.breed)?.breed ?? null;
    const mergedColor = allRows.find((r) => r.color)?.color ?? null;
    const mergedGender = allRows.find((r) => r.gender)?.gender ?? null;
    const mergedSterilized = allRows.some((r) => Boolean(r.sterilized));
    const mergedBirthDate = allRows.find((r) => r.birth_date)?.birth_date ?? null;
    const mergedWeight = Number(primary.weight_kg) > 0
      ? primary.weight_kg
      : allRows.find((r) => Number(r.weight_kg) > 0)?.weight_kg ?? 0;
    const mergedMicrochip = allRows.find((r) => r.microchip_no)?.microchip_no ?? null;
    const mergedPhotoUrl = allRows.find((r) => r.photo_url)?.photo_url ?? null;

    // Consolidate allergies without losing any drug/food contraindications
    const mergedAllergies =
      consolidateTextList(
        allRows.map((r) => r.allergies),
        ["tidak ada", "none", "-", "nihil"]
      ) || primary.allergies || null;

    const mergedNotes = consolidateTextList(allRows.map((r) => r.notes)) || primary.notes || null;

    // Re-assign all clinical, medical, and operational records to primaryId
    const petTablesWithPetName = [
      "clinic_visits",
      "soap_notes",
      "medical_records",
      "inpatients",
      "discharge_notes",
      "lab_tests",
      "surgical_procedures",
      "vac_schedules",
      "vac_histories",
      "deworming_records",
      "pre_consult_forms",
      "referral_letters",
      "visit_surveys",
      "care_plans",
      "doc_bookings",
      "grooming_sessions",
      "hotel_reservations",
      "informed_consents",
      "patient_photos",
      "ambulance_requests",
    ];

    for (const table of petTablesWithPetName) {
      await client.query(
        `UPDATE ${table} SET pet_id = $1, pet_name = $2 WHERE pet_id = ANY($3::uuid[])`,
        [primaryId, primary.name, cleanDupIds]
      );
    }

    // Soft-delete duplicate pets
    await client.query(
      "UPDATE pets SET deleted_at = now() WHERE id = ANY($1::uuid[])",
      [cleanDupIds]
    );

    // Recalculate pet_count for all affected customers
    const affectedCustomerIds = Array.from(new Set(allRows.map((r) => r.customer_id)));
    for (const custId of affectedCustomerIds) {
      await client.query(
        `UPDATE customers
         SET pet_count = (SELECT COUNT(*)::int FROM pets WHERE customer_id = $1 AND deleted_at IS NULL)
         WHERE id = $1`,
        [custId]
      );
    }

    const { rows: updatedRows } = await client.query(
      `UPDATE pets
       SET breed = $1, color = $2, gender = $3, sterilized = $4, birth_date = $5,
           weight_kg = $6, microchip_no = $7, allergies = $8, notes = $9, photo_url = $10
       WHERE id = $11 RETURNING *`,
      [
        mergedBreed,
        mergedColor,
        mergedGender,
        mergedSterilized,
        mergedBirthDate,
        mergedWeight,
        mergedMicrochip,
        mergedAllergies,
        mergedNotes,
        mergedPhotoUrl,
        primaryId,
      ]
    );

    const { rows: customerRows } = await client.query("SELECT name FROM customers WHERE id = $1", [primary.customer_id]);
    return toPet(updatedRows[0], customerRows[0]?.name);
  });
}

