import { pool } from "./db";

const d = (v: any) => v instanceof Date ? v.toISOString().substring(0, 10) : (v ? String(v) : "");

function toVS(row: any) {
  return {
    id: row.id as string, petId: (row.pet_id as string) ?? "",
    petName: row.pet_name as string, customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string, vaccineName: row.vaccine_name as string,
    dueDate: d(row.due_date), status: row.status as string,
    notes: row.notes ?? undefined,
  };
}

function toVH(row: any) {
  return {
    id: row.id as string, petId: (row.pet_id as string) ?? "",
    petName: row.pet_name as string, customerName: row.customer_name as string,
    vaccineName: row.vaccine_name as string, givenDate: d(row.given_date),
    nextDueDate: d(row.next_due_date), doctorName: row.doctor_name as string,
    batchNumber: row.batch_number as string,
    expiryDate: row.expiry_date ? d(row.expiry_date) : "",
    certificateNo: row.certificate_no as string,
  };
}

function toDW(row: any) {
  return {
    id: row.id as string, petId: (row.pet_id as string) ?? "",
    date: d(row.date), medicineName: row.medicine_name as string,
    dosage: row.dosage as string, givenBy: row.given_by as string,
    nextDueDate: d(row.next_due_date),
  };
}

// ── Vac Schedules ─────────────────────────────────────────────────────────────

export async function listVacSchedules() {
  const { rows } = await pool.query("SELECT * FROM vac_schedules ORDER BY due_date");
  return rows.map(toVS);
}

export async function createVacSchedule(input: {
  petId?: string; petName: string; customerName: string; customerPhone?: string;
  vaccineName: string; dueDate: string; status?: string; notes?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO vac_schedules (pet_id, pet_name, customer_name, customer_phone, vaccine_name, due_date, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [input.petId || null, input.petName, input.customerName, input.customerPhone ?? "",
     input.vaccineName, input.dueDate, input.status ?? "Mendatang", input.notes ?? null]
  );
  return toVS(rows[0]);
}

export async function updateVacScheduleStatus(id: string, status: string) {
  const { rows } = await pool.query(
    "UPDATE vac_schedules SET status=$1 WHERE id=$2 RETURNING *", [status, id]
  );
  if (!rows[0]) throw new Error("Jadwal vaksinasi tidak ditemukan.");
  return toVS(rows[0]);
}

// ── Vac Histories ─────────────────────────────────────────────────────────────

export async function listVacHistories() {
  const { rows } = await pool.query("SELECT * FROM vac_histories ORDER BY given_date DESC LIMIT 2000");
  return rows.map(toVH);
}

// Atomic: create history + mark matching schedule done + create medical record.
export async function createVacHistory(input: {
  petId?: string; petName: string; customerName: string; vaccineName: string;
  givenDate: string; nextDueDate: string; doctorName: string; batchNumber?: string;
  expiryDate?: string; certificateNo?: string;
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: vh } = await client.query(
      `INSERT INTO vac_histories (pet_id, pet_name, customer_name, vaccine_name, given_date, next_due_date, doctor_name, batch_number, expiry_date, certificate_no)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [input.petId || null, input.petName, input.customerName, input.vaccineName,
       input.givenDate, input.nextDueDate, input.doctorName, input.batchNumber ?? "",
       input.expiryDate || null, input.certificateNo ?? ""]
    );
    if (input.petId) {
      await client.query(
        `UPDATE vac_schedules SET status='Selesai' WHERE pet_id=$1 AND vaccine_name ILIKE $2 AND status != 'Selesai'`,
        [input.petId, `%${input.vaccineName}%`]
      );
      await client.query(
        `INSERT INTO medical_records (pet_id, date, type, title, description, performed_by)
         VALUES ($1,$2,'Vaksinasi',$3,$4,$5)`,
        [input.petId, input.givenDate,
         `Vaksinasi: ${input.vaccineName}`,
         `Sertifikat No: ${input.certificateNo ?? "-"}, Batch: ${input.batchNumber ?? "-"}`,
         input.doctorName]
      );
    }
    await client.query("COMMIT");
    return toVH(vh[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ── Deworming Records ─────────────────────────────────────────────────────────

export async function listDewormingRecords() {
  const { rows } = await pool.query("SELECT * FROM deworming_records ORDER BY date DESC LIMIT 1000");
  return rows.map(toDW);
}

export async function createDewormingRecord(input: {
  petId?: string; date: string; medicineName: string; dosage?: string;
  givenBy?: string; nextDueDate: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO deworming_records (pet_id, date, medicine_name, dosage, given_by, next_due_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [input.petId || null, input.date, input.medicineName, input.dosage ?? "", input.givenBy ?? "", input.nextDueDate]
  );
  return toDW(rows[0]);
}
