import { pool } from "./db";

const d = (v: any) => v instanceof Date ? v.toISOString().substring(0, 10) : (v ? String(v) : "");

function toAbsence(row: any) {
  return {
    id: row.id as string, employeeId: (row.employee_id as string) ?? "",
    employeeName: row.employee_name as string, date: d(row.date),
    checkIn: row.check_in as string, checkOut: row.check_out ?? undefined,
    status: row.status as string, notes: row.notes ?? undefined,
  };
}

function toLeave(row: any) {
  return {
    id: row.id as string, employeeId: (row.employee_id as string) ?? "",
    employeeName: row.employee_name as string, leaveType: row.leave_type as string,
    startDate: d(row.start_date), endDate: d(row.end_date),
    totalDays: Number(row.total_days), reason: row.reason as string,
    status: row.status as string,
  };
}

export async function listAbsenceRecords() {
  const { rows } = await pool.query("SELECT * FROM absence_records ORDER BY date DESC LIMIT 2000");
  return rows.map(toAbsence);
}

export async function createAbsenceRecord(input: {
  employeeId?: string; employeeName: string; date: string; checkIn: string;
  checkOut?: string; status?: string; notes?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO absence_records (employee_id, employee_name, date, check_in, check_out, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.employeeId || null, input.employeeName, input.date, input.checkIn,
     input.checkOut ?? null, input.status ?? "Hadir", input.notes ?? null]
  );
  return toAbsence(rows[0]);
}

export async function listLeaveRequests() {
  const { rows } = await pool.query("SELECT * FROM leave_requests ORDER BY created_at DESC LIMIT 500");
  return rows.map(toLeave);
}

export async function createLeaveRequest(input: {
  employeeId?: string; employeeName: string; leaveType: string;
  startDate: string; endDate: string; totalDays: number; reason?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO leave_requests (employee_id, employee_name, leave_type, start_date, end_date, total_days, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.employeeId || null, input.employeeName, input.leaveType,
     input.startDate, input.endDate, input.totalDays, input.reason ?? ""]
  );
  return toLeave(rows[0]);
}

export async function updateLeaveRequestStatus(id: string, status: string) {
  const { rows } = await pool.query(
    "UPDATE leave_requests SET status=$1 WHERE id=$2 RETURNING *", [status, id]
  );
  if (!rows[0]) throw new Error("Permohonan cuti tidak ditemukan.");
  return toLeave(rows[0]);
}
