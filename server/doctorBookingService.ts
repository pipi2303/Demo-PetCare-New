import { pool } from "./db";

const d = (v: any) => v instanceof Date ? v.toISOString().substring(0, 10) : (v ? String(v) : "");

function toBooking(row: any) {
  return {
    id: row.id as string, bookingNo: row.booking_no as string,
    customerId: (row.customer_id as string) ?? "", customerName: row.customer_name as string,
    petId: (row.pet_id as string) ?? "", petName: row.pet_name as string,
    petSpecies: row.pet_species as string,
    doctorId: row.doctor_id as string, doctorName: row.doctor_name as string,
    date: d(row.date), timeSlot: row.time_slot as string,
    status: row.status as string, complaint: row.complaint as string,
    branchId: row.branch_id ?? undefined,
    googleCalendarEventId: row.google_calendar_event_id ?? undefined,
    googleCalendarSyncStatus: row.google_calendar_sync_status ?? undefined,
    googleCalendarHtmlLink: row.google_calendar_html_link ?? undefined,
    lastSyncedAt: row.last_synced_at ? d(row.last_synced_at) : undefined,
    createdAt: d(row.created_at),
  };
}

export async function listDoctorBookings() {
  const { rows } = await pool.query("SELECT * FROM doc_bookings ORDER BY date DESC, created_at DESC LIMIT 1000");
  return rows.map(toBooking);
}

export async function createDoctorBooking(input: {
  customerId?: string; customerName: string; petId?: string; petName: string;
  petSpecies?: string; doctorId?: string; doctorName: string; date: string;
  timeSlot?: string; status?: string; complaint?: string; branchId?: string;
}) {
  const bookingNo = "DOC-" + new Date().toISOString().replace(/[-:]/g, "").substring(0, 8) + "-" + Math.floor(100 + Math.random() * 900);
  const { rows } = await pool.query(
    `INSERT INTO doc_bookings (booking_no, customer_id, customer_name, pet_id, pet_name, pet_species, doctor_id, doctor_name, date, time_slot, status, complaint, branch_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [bookingNo, input.customerId || null, input.customerName, input.petId || null,
     input.petName, input.petSpecies ?? "", input.doctorId ?? "", input.doctorName,
     input.date, input.timeSlot ?? "", input.status ?? "Menunggu",
     input.complaint ?? "", input.branchId || null]
  );
  return toBooking(rows[0]);
}

export async function updateDoctorBooking(id: string, patch: Record<string, any>) {
  const { rows: cur } = await pool.query("SELECT * FROM doc_bookings WHERE id=$1", [id]);
  if (!cur[0]) throw new Error("Booking tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    `UPDATE doc_bookings SET customer_name=$1, pet_name=$2, doctor_id=$3, doctor_name=$4,
       date=$5, time_slot=$6, status=$7, complaint=$8, branch_id=$9,
       google_calendar_event_id=$10, google_calendar_sync_status=$11,
       google_calendar_html_link=$12, last_synced_at=$13
     WHERE id=$14 RETURNING *`,
    [
      patch.customerName ?? c.customer_name, patch.petName ?? c.pet_name,
      patch.doctorId ?? c.doctor_id, patch.doctorName ?? c.doctor_name,
      patch.date ?? c.date, patch.timeSlot ?? c.time_slot,
      patch.status ?? c.status, patch.complaint ?? c.complaint,
      patch.branchId ?? c.branch_id,
      patch.googleCalendarEventId ?? c.google_calendar_event_id,
      patch.googleCalendarSyncStatus ?? c.google_calendar_sync_status,
      patch.googleCalendarHtmlLink ?? c.google_calendar_html_link,
      patch.lastSyncedAt ? new Date(patch.lastSyncedAt) : c.last_synced_at, id,
    ]
  );
  return toBooking(rows[0]);
}

export async function updateDoctorBookingStatus(id: string, status: string) {
  const { rows } = await pool.query(
    "UPDATE doc_bookings SET status=$1 WHERE id=$2 RETURNING *", [status, id]
  );
  if (!rows[0]) throw new Error("Booking tidak ditemukan.");
  return toBooking(rows[0]);
}
