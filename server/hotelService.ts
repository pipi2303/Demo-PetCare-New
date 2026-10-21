import { pool } from "./db";

function toRoom(row: any) {
  return {
    id: row.id as string,
    roomNo: row.room_no as string,
    roomType: row.room_type as string,
    capacity: Number(row.capacity),
    dailyRate: Number(row.daily_rate),
    isActive: Boolean(row.is_active),
    notes: row.notes ?? undefined,
  };
}

function toReservation(row: any) {
  const d = (v: any) => v instanceof Date ? v.toISOString().substring(0, 10) : String(v);
  return {
    id: row.id as string,
    reservationNo: row.reservation_no as string,
    petId: (row.pet_id as string) ?? "",
    petName: row.pet_name as string,
    customerName: row.customer_name as string,
    roomType: row.room_type as string,
    roomNo: row.room_no as string,
    checkInDate: d(row.check_in_date),
    checkOutDate: d(row.check_out_date),
    totalNights: Number(row.total_nights),
    dailyRate: Number(row.daily_rate),
    totalCost: Number(row.total_cost),
    status: row.status as string,
    notes: row.notes ?? undefined,
  };
}

function toBooking(row: any) {
  const d = (v: any) => v instanceof Date ? v.toISOString().substring(0, 10) : String(v);
  return {
    id: row.id as string,
    bookingNo: row.booking_no as string,
    customerName: row.customer_name as string,
    petName: row.pet_name as string,
    roomNo: row.room_no as string,
    checkInDate: d(row.check_in_date),
    checkOutDate: d(row.check_out_date),
    nights: Number(row.nights),
    totalCost: Number(row.total_cost),
    status: row.status as string,
    notes: row.notes ?? undefined,
  };
}

function toMonitoring(row: any) {
  return {
    id: row.id as string,
    reservationId: (row.reservation_id as string) ?? "",
    petName: row.pet_name as string,
    roomNo: row.room_no as string,
    date: row.date instanceof Date ? row.date.toISOString().substring(0, 10) : String(row.date),
    morningFeeding: Boolean(row.morning_feeding),
    morningMedication: Boolean(row.morning_medication),
    afternoonPlaytime: Boolean(row.afternoon_playtime),
    eveningFeeding: Boolean(row.evening_feeding),
    eveningRest: Boolean(row.evening_rest),
    temperatureC: row.temperature_c != null ? Number(row.temperature_c) : undefined,
    notes: row.notes ?? undefined,
    staffName: row.staff_name as string,
  };
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

export async function listHotelRooms() {
  const { rows } = await pool.query("SELECT * FROM hotel_rooms ORDER BY room_no");
  return rows.map(toRoom);
}

export async function createHotelRoom(input: {
  roomNo: string; roomType: string; capacity?: number; dailyRate: number;
  isActive?: boolean; notes?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO hotel_rooms (room_no, room_type, capacity, daily_rate, is_active, notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [input.roomNo, input.roomType, input.capacity ?? 1, input.dailyRate,
     input.isActive ?? true, input.notes ?? null]
  );
  return toRoom(rows[0]);
}

export async function updateHotelRoom(id: string, patch: Record<string, any>) {
  const { rows: cur } = await pool.query("SELECT * FROM hotel_rooms WHERE id=$1", [id]);
  if (!cur[0]) throw new Error("Kamar tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    `UPDATE hotel_rooms SET room_no=$1, room_type=$2, capacity=$3, daily_rate=$4, is_active=$5, notes=$6
     WHERE id=$7 RETURNING *`,
    [patch.roomNo ?? c.room_no, patch.roomType ?? c.room_type, patch.capacity ?? c.capacity,
     patch.dailyRate ?? c.daily_rate, patch.isActive ?? c.is_active, patch.notes ?? c.notes, id]
  );
  return toRoom(rows[0]);
}

export async function deleteHotelRoom(id: string) {
  await pool.query("DELETE FROM hotel_rooms WHERE id=$1", [id]);
}

// ── Reservations ──────────────────────────────────────────────────────────────

export async function listHotelReservations() {
  const { rows } = await pool.query(
    "SELECT * FROM hotel_reservations ORDER BY created_at DESC LIMIT 500"
  );
  return rows.map(toReservation);
}

export async function createHotelReservation(input: {
  petId?: string; petName: string; customerName: string; roomType: string;
  roomNo: string; checkInDate: string; checkOutDate: string; totalNights: number;
  dailyRate: number; totalCost: number; status?: string; notes?: string;
}) {
  const reservationNo = "HTL-" + Date.now().toString().slice(-6);
  const { rows } = await pool.query(
    `INSERT INTO hotel_reservations
       (reservation_no, pet_id, pet_name, customer_name, room_type, room_no,
        check_in_date, check_out_date, total_nights, daily_rate, total_cost, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [reservationNo, input.petId || null, input.petName, input.customerName,
     input.roomType, input.roomNo, input.checkInDate, input.checkOutDate,
     input.totalNights, input.dailyRate, input.totalCost,
     input.status ?? "Reservasi", input.notes ?? null]
  );
  return toReservation(rows[0]);
}

export async function updateHotelReservationStatus(id: string, status: string) {
  const { rows } = await pool.query(
    "UPDATE hotel_reservations SET status=$1 WHERE id=$2 RETURNING *",
    [status, id]
  );
  if (!rows[0]) throw new Error("Reservasi tidak ditemukan.");
  return toReservation(rows[0]);
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function listHotelBookings() {
  const { rows } = await pool.query(
    "SELECT * FROM hotel_bookings ORDER BY created_at DESC LIMIT 500"
  );
  return rows.map(toBooking);
}

export async function createHotelBooking(input: {
  customerName: string; petName: string; roomNo: string; checkInDate: string;
  checkOutDate: string; nights: number; totalCost: number; status?: string; notes?: string;
}) {
  const bookingNo = "HTL-" + Date.now().toString().slice(-6);
  const { rows } = await pool.query(
    `INSERT INTO hotel_bookings
       (booking_no, customer_name, pet_name, room_no, check_in_date, check_out_date,
        nights, total_cost, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [bookingNo, input.customerName, input.petName, input.roomNo,
     input.checkInDate, input.checkOutDate, input.nights, input.totalCost,
     input.status ?? "Reservasi", input.notes ?? null]
  );
  return toBooking(rows[0]);
}

// ── Daily Monitorings ─────────────────────────────────────────────────────────

export async function listDailyMonitorings() {
  const { rows } = await pool.query(
    "SELECT * FROM daily_monitorings ORDER BY created_at DESC LIMIT 1000"
  );
  return rows.map(toMonitoring);
}

export async function createDailyMonitoring(input: {
  reservationId?: string; petName: string; roomNo: string; date?: string;
  morningFeeding?: boolean; morningMedication?: boolean; afternoonPlaytime?: boolean;
  eveningFeeding?: boolean; eveningRest?: boolean; temperatureC?: number;
  notes?: string; staffName: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO daily_monitorings
       (reservation_id, pet_name, room_no, date, morning_feeding, morning_medication,
        afternoon_playtime, evening_feeding, evening_rest, temperature_c, notes, staff_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [input.reservationId || null, input.petName, input.roomNo,
     input.date ?? new Date().toISOString().substring(0, 10),
     input.morningFeeding ?? false, input.morningMedication ?? false,
     input.afternoonPlaytime ?? false, input.eveningFeeding ?? false,
     input.eveningRest ?? false, input.temperatureC ?? null,
     input.notes ?? null, input.staffName]
  );
  return toMonitoring(rows[0]);
}
