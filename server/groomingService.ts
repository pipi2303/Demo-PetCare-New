import { pool } from "./db";

function toPkg(row: any) {
  return {
    id: row.id as string,
    name: row.name as string,
    packageType: row.package_type as string,
    priceSmall: Number(row.price_small),
    priceMedium: Number(row.price_medium),
    priceLarge: Number(row.price_large),
    estimatedDurationMins: Number(row.estimated_duration_mins),
    description: row.description ?? undefined,
    isActive: Boolean(row.is_active),
  };
}

function toBooking(row: any) {
  return {
    id: row.id as string,
    bookingNo: row.booking_no as string,
    customerName: row.customer_name as string,
    petName: row.pet_name as string,
    groomerName: row.groomer_name as string,
    packageType: row.package_type as string,
    date: row.date instanceof Date ? row.date.toISOString().substring(0, 10) : String(row.date),
    timeSlot: row.time_slot as string,
    price: Number(row.price),
    status: row.status as string,
    notes: row.notes ?? undefined,
  };
}

function toSession(row: any) {
  return {
    id: row.id as string,
    sessionNo: row.session_no as string,
    petId: (row.pet_id as string) ?? "",
    petName: row.pet_name as string,
    customerName: row.customer_name as string,
    groomerName: row.groomer_name as string,
    packageType: row.package_type as string,
    petSize: row.pet_size as string,
    stage: row.stage as string,
    date: row.date instanceof Date ? row.date.toISOString().substring(0, 10) : String(row.date),
    timeSlot: row.time_slot as string,
    price: Number(row.price),
    beforePhotoUrl: row.before_photo_url ?? undefined,
    afterPhotoUrl: row.after_photo_url ?? undefined,
    notes: row.notes ?? undefined,
  };
}

// ── Packages ─────────────────────────────────────────────────────────────────

export async function listGroomingPackages() {
  const { rows } = await pool.query("SELECT * FROM grooming_packages ORDER BY name");
  return rows.map(toPkg);
}

export async function createGroomingPackage(input: {
  name: string; packageType: string; priceSmall: number; priceMedium: number;
  priceLarge: number; estimatedDurationMins: number; description?: string; isActive?: boolean;
}) {
  const { rows } = await pool.query(
    `INSERT INTO grooming_packages
       (name, package_type, price_small, price_medium, price_large, estimated_duration_mins, description, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [input.name, input.packageType, input.priceSmall, input.priceMedium, input.priceLarge,
     input.estimatedDurationMins, input.description ?? null, input.isActive ?? true]
  );
  return toPkg(rows[0]);
}

export async function updateGroomingPackage(id: string, patch: Record<string, any>) {
  const { rows: cur } = await pool.query("SELECT * FROM grooming_packages WHERE id=$1", [id]);
  if (!cur[0]) throw new Error("Paket grooming tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    `UPDATE grooming_packages SET name=$1, package_type=$2, price_small=$3, price_medium=$4,
       price_large=$5, estimated_duration_mins=$6, description=$7, is_active=$8 WHERE id=$9 RETURNING *`,
    [patch.name ?? c.name, patch.packageType ?? c.package_type,
     patch.priceSmall ?? c.price_small, patch.priceMedium ?? c.price_medium,
     patch.priceLarge ?? c.price_large, patch.estimatedDurationMins ?? c.estimated_duration_mins,
     patch.description ?? c.description, patch.isActive ?? c.is_active, id]
  );
  return toPkg(rows[0]);
}

export async function deleteGroomingPackage(id: string) {
  await pool.query("DELETE FROM grooming_packages WHERE id=$1", [id]);
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function listGroomingBookings() {
  const { rows } = await pool.query(
    "SELECT * FROM grooming_bookings ORDER BY created_at DESC LIMIT 500"
  );
  return rows.map(toBooking);
}

export async function createGroomingBooking(input: {
  customerName: string; petName: string; groomerName?: string; packageType: string;
  date: string; timeSlot?: string; price: number; status?: string; notes?: string;
}) {
  const bookingNo = "GRM-" + Date.now().toString().slice(-6);
  const { rows } = await pool.query(
    `INSERT INTO grooming_bookings
       (booking_no, customer_name, pet_name, groomer_name, package_type, date, time_slot, price, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [bookingNo, input.customerName, input.petName, input.groomerName ?? "",
     input.packageType, input.date, input.timeSlot ?? "", input.price,
     input.status ?? "Menunggu", input.notes ?? null]
  );
  return toBooking(rows[0]);
}

export async function updateGroomingBooking(id: string, patch: Record<string, any>) {
  const { rows: cur } = await pool.query("SELECT * FROM grooming_bookings WHERE id=$1", [id]);
  if (!cur[0]) throw new Error("Booking grooming tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    `UPDATE grooming_bookings SET customer_name=$1, pet_name=$2, groomer_name=$3, package_type=$4,
       date=$5, time_slot=$6, price=$7, status=$8, notes=$9 WHERE id=$10 RETURNING *`,
    [patch.customerName ?? c.customer_name, patch.petName ?? c.pet_name,
     patch.groomerName ?? c.groomer_name, patch.packageType ?? c.package_type,
     patch.date ?? c.date, patch.timeSlot ?? c.time_slot, patch.price ?? c.price,
     patch.status ?? c.status, patch.notes ?? c.notes, id]
  );
  return toBooking(rows[0]);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function listGroomingSessions() {
  const { rows } = await pool.query(
    "SELECT * FROM grooming_sessions ORDER BY created_at DESC LIMIT 500"
  );
  return rows.map(toSession);
}

export async function createGroomingSession(input: {
  petId?: string; petName: string; customerName: string; groomerName?: string;
  packageType: string; petSize: string; stage?: string; date: string;
  timeSlot?: string; price: number; notes?: string;
}) {
  const sessionNo = "GRM-" + Date.now().toString().slice(-6);
  const { rows } = await pool.query(
    `INSERT INTO grooming_sessions
       (session_no, pet_id, pet_name, customer_name, groomer_name, package_type, pet_size, stage, date, time_slot, price, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [sessionNo, input.petId || null, input.petName, input.customerName,
     input.groomerName ?? "", input.packageType, input.petSize,
     input.stage ?? "Booking", input.date, input.timeSlot ?? "", input.price, input.notes ?? null]
  );
  return toSession(rows[0]);
}

export async function updateGroomingStage(id: string, stage: string) {
  const { rows } = await pool.query(
    "UPDATE grooming_sessions SET stage=$1 WHERE id=$2 RETURNING *",
    [stage, id]
  );
  if (!rows[0]) throw new Error("Sesi grooming tidak ditemukan.");
  return toSession(rows[0]);
}
