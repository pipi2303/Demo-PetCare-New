import crypto from "crypto";
import { pool, withTransaction } from "./db";
import type { PoolClient } from "pg";

export type AmbulanceStatus = "received" | "triaged" | "assigned" | "en_route" | "arrived" | "patient_onboard" | "at_clinic" | "handed_over" | "closed" | "cancelled";
export type TelehealthStatus = "scheduled" | "waiting_room" | "in_progress" | "completed" | "cancelled" | "no_show";

export interface AmbulanceUnitRecord {
  id: string;
  code: string;
  status: "available" | "assigned" | "maintenance";
  updatedAt: string;
}

export interface OperationEvent {
  at: string;
  actor: string;
  type: string;
  note?: string;
}

export interface AmbulanceRequestRecord {
  id: string;
  requestNo: string;
  patientName: string;
  callerName: string;
  callerPhone: string;
  urgency: "emergency" | "urgent" | "normal";
  pickupAddress: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  status: AmbulanceStatus;
  assignedUnitId?: string;
  createdAt: string;
  updatedAt: string;
  events: OperationEvent[];
}

export interface TelehealthRecord {
  id: string;
  sessionNo: string;
  patientName: string;
  customerId: string;
  doctorId: string;
  scheduledAt: string;
  durationMinutes: number;
  consentAcceptedAt: string;
  status: TelehealthStatus;
  createdAt: string;
  updatedAt: string;
  events: OperationEvent[];
}

function now() {
  return new Date().toISOString();
}

function toAmbulanceUnit(row: any): AmbulanceUnitRecord {
  return { id: row.id, code: row.code, status: row.status, updatedAt: row.updated_at.toISOString() };
}

function toEvent(row: any): OperationEvent {
  return { at: row.at.toISOString(), actor: row.actor, type: row.type, note: row.note ?? undefined };
}

function toAmbulanceRequest(row: any, events: OperationEvent[]): AmbulanceRequestRecord {
  return {
    id: row.id,
    requestNo: row.request_no,
    patientName: row.patient_name,
    callerName: row.caller_name,
    callerPhone: row.caller_phone,
    urgency: row.urgency,
    pickupAddress: row.pickup_address,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    assignedUnitId: row.assigned_unit_id ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    events,
  };
}

function toTelehealthSession(row: any, events: OperationEvent[]): TelehealthRecord {
  return {
    id: row.id,
    sessionNo: row.session_no,
    patientName: row.patient_name,
    customerId: row.customer_id,
    doctorId: row.doctor_id,
    scheduledAt: row.scheduled_at.toISOString(),
    durationMinutes: row.duration_minutes,
    consentAcceptedAt: row.consent_accepted_at.toISOString(),
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    events,
  };
}

async function loadAmbulanceRequests(): Promise<AmbulanceRequestRecord[]> {
  const { rows: requests } = await pool.query("SELECT * FROM ambulance_requests ORDER BY created_at DESC");
  const { rows: events } = await pool.query("SELECT * FROM ambulance_events ORDER BY at ASC");
  const eventsByRequest = new Map<string, OperationEvent[]>();
  for (const e of events) {
    const list = eventsByRequest.get(e.request_id) || [];
    list.push(toEvent(e));
    eventsByRequest.set(e.request_id, list);
  }
  return requests.map((r) => toAmbulanceRequest(r, eventsByRequest.get(r.id) || []));
}

async function loadTelehealthSessions(): Promise<TelehealthRecord[]> {
  const { rows: sessions } = await pool.query("SELECT * FROM telehealth_sessions ORDER BY created_at DESC");
  const { rows: events } = await pool.query("SELECT * FROM telehealth_events ORDER BY at ASC");
  const eventsBySession = new Map<string, OperationEvent[]>();
  for (const e of events) {
    const list = eventsBySession.get(e.session_id) || [];
    list.push(toEvent(e));
    eventsBySession.set(e.session_id, list);
  }
  return sessions.map((s) => toTelehealthSession(s, eventsBySession.get(s.id) || []));
}

export async function initOperationsService() {
  const { rows } = await pool.query<{ count: string }>(
    "SELECT (SELECT count(*) FROM ambulance_requests) + (SELECT count(*) FROM telehealth_sessions) AS count"
  );
  console.log(`[OperationsService] 🚑 Postgres-backed operations store ready (${rows[0].count} catatan existing).`);
}

export async function listOperations() {
  const [ambulanceUnitsRows, ambulanceRequests, telehealthSessions] = await Promise.all([
    pool.query("SELECT * FROM ambulance_units ORDER BY code ASC"),
    loadAmbulanceRequests(),
    loadTelehealthSessions(),
  ]);
  return {
    ambulanceUnits: ambulanceUnitsRows.rows.map(toAmbulanceUnit),
    ambulanceRequests,
    telehealthSessions,
  };
}

export async function registerAmbulanceUnit(input: { code: string; status?: AmbulanceUnitRecord["status"] }, _actor: string) {
  const code = input.code?.trim().toUpperCase();
  if (!code) throw new Error("Kode unit ambulance wajib diisi.");
  const { rows: existingRows } = await pool.query("SELECT * FROM ambulance_units WHERE code = $1", [code]);
  if (existingRows[0]) return toAmbulanceUnit(existingRows[0]);
  const { rows } = await pool.query(
    "INSERT INTO ambulance_units (code, status) VALUES ($1, $2) RETURNING *",
    [code, input.status || "available"]
  );
  return toAmbulanceUnit(rows[0]);
}

export async function createAmbulanceRequest(
  input: Omit<AmbulanceRequestRecord, "id" | "requestNo" | "status" | "createdAt" | "updatedAt" | "events">,
  actor: string
) {
  if (!input.patientName?.trim() || !input.callerName?.trim() || !input.callerPhone?.trim() || !input.pickupAddress?.trim()) {
    throw new Error("Data pasien, pelapor, telepon, dan lokasi penjemputan wajib diisi.");
  }
  if (input.latitude !== undefined && (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90)) throw new Error("Latitude tidak valid.");
  if (input.longitude !== undefined && (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180)) throw new Error("Longitude tidak valid.");

  const createdAt = now();
  const requestNo = `AMB-${createdAt.slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO ambulance_requests (request_no, patient_name, caller_name, caller_phone, urgency, pickup_address, latitude, longitude, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'received') RETURNING *`,
      [
        requestNo,
        input.patientName,
        input.callerName,
        input.callerPhone,
        input.urgency,
        input.pickupAddress,
        input.latitude ?? null,
        input.longitude ?? null,
        input.notes ?? null,
      ]
    );
    const request = rows[0];
    const { rows: eventRows } = await client.query(
      "INSERT INTO ambulance_events (request_id, actor, type) VALUES ($1, $2, 'received') RETURNING *",
      [request.id, actor]
    );
    return toAmbulanceRequest(request, [toEvent(eventRows[0])]);
  });
}

const AMBULANCE_TRANSITIONS: Record<AmbulanceStatus, AmbulanceStatus[]> = {
  received: ["triaged", "cancelled"], triaged: ["assigned", "cancelled"], assigned: ["en_route", "cancelled"],
  en_route: ["arrived", "cancelled"], arrived: ["patient_onboard", "cancelled"], patient_onboard: ["at_clinic"],
  at_clinic: ["handed_over"], handed_over: ["closed"], closed: [], cancelled: [],
};

export async function transitionAmbulanceRequest(
  id: string,
  to: AmbulanceStatus,
  actor: string,
  input: { unitId?: string; note?: string } = {}
) {
  return withTransaction(async (client: PoolClient) => {
    const { rows } = await client.query("SELECT * FROM ambulance_requests WHERE id = $1 FOR UPDATE", [id]);
    const requestRow = rows[0];
    if (!requestRow) throw new Error("Permintaan ambulance tidak ditemukan.");
    if (!AMBULANCE_TRANSITIONS[requestRow.status as AmbulanceStatus].includes(to)) {
      throw new Error(`Transisi ${requestRow.status} ke ${to} tidak diizinkan.`);
    }

    let assignedUnitId: string | null = requestRow.assigned_unit_id;

    if (to === "assigned") {
      const { rows: unitRows } = await client.query("SELECT * FROM ambulance_units WHERE id = $1 FOR UPDATE", [input.unitId]);
      const unit = unitRows[0];
      if (!unit || unit.status !== "available") throw new Error("Unit ambulance tidak tersedia.");
      await client.query("UPDATE ambulance_units SET status = 'assigned', updated_at = now() WHERE id = $1", [unit.id]);
      assignedUnitId = unit.id;
    }

    if ((to === "cancelled" || to === "closed") && requestRow.assigned_unit_id) {
      await client.query("UPDATE ambulance_units SET status = 'available', updated_at = now() WHERE id = $1 AND status = 'assigned'", [
        requestRow.assigned_unit_id,
      ]);
    }

    const { rows: updatedRows } = await client.query(
      "UPDATE ambulance_requests SET status = $1, assigned_unit_id = $2, updated_at = now() WHERE id = $3 RETURNING *",
      [to, assignedUnitId, id]
    );
    await client.query("INSERT INTO ambulance_events (request_id, actor, type, note) VALUES ($1, $2, $3, $4)", [
      id,
      actor,
      to,
      input.note ?? null,
    ]);
    const { rows: eventRows } = await client.query("SELECT * FROM ambulance_events WHERE request_id = $1 ORDER BY at ASC", [id]);
    return toAmbulanceRequest(updatedRows[0], eventRows.map(toEvent));
  });
}

const TELEHEALTH_TRANSITIONS: Record<TelehealthStatus, TelehealthStatus[]> = {
  scheduled: ["waiting_room", "cancelled", "no_show"], waiting_room: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed"], completed: [], cancelled: [], no_show: [],
};

export async function createTelehealthSession(
  input: Omit<TelehealthRecord, "id" | "sessionNo" | "status" | "createdAt" | "updatedAt" | "events">,
  actor: string
) {
  if (!input.patientName?.trim() || !input.customerId?.trim() || !input.doctorId?.trim() || !input.consentAcceptedAt) {
    throw new Error("Pasien, pelanggan, dokter, dan persetujuan telehealth wajib diisi.");
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 15 || input.durationMinutes > 60) {
    throw new Error("Durasi telehealth harus 15–60 menit.");
  }
  if (Number.isNaN(Date.parse(input.scheduledAt))) throw new Error("Jadwal telehealth tidak valid.");

  const { rows: conflictRows } = await pool.query(
    `SELECT 1 FROM telehealth_sessions WHERE doctor_id = $1 AND scheduled_at = $2 AND status NOT IN ('cancelled', 'no_show')`,
    [input.doctorId, input.scheduledAt]
  );
  if (conflictRows.length > 0) throw new Error("Dokter sudah memiliki sesi telehealth pada waktu tersebut.");

  const createdAt = now();
  const sessionNo = `TH-${createdAt.slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO telehealth_sessions (session_no, patient_name, customer_id, doctor_id, scheduled_at, duration_minutes, consent_accepted_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'scheduled') RETURNING *`,
      [sessionNo, input.patientName, input.customerId, input.doctorId, input.scheduledAt, input.durationMinutes, input.consentAcceptedAt]
    );
    const session = rows[0];
    const { rows: eventRows } = await client.query(
      "INSERT INTO telehealth_events (session_id, actor, type) VALUES ($1, $2, 'scheduled') RETURNING *",
      [session.id, actor]
    );
    return toTelehealthSession(session, [toEvent(eventRows[0])]);
  });
}

export async function transitionTelehealthSession(id: string, to: TelehealthStatus, actor: string, note?: string) {
  return withTransaction(async (client) => {
    const { rows } = await client.query("SELECT * FROM telehealth_sessions WHERE id = $1 FOR UPDATE", [id]);
    const session = rows[0];
    if (!session) throw new Error("Sesi telehealth tidak ditemukan.");
    if (!TELEHEALTH_TRANSITIONS[session.status as TelehealthStatus].includes(to)) {
      throw new Error(`Transisi ${session.status} ke ${to} tidak diizinkan.`);
    }
    const { rows: updatedRows } = await client.query(
      "UPDATE telehealth_sessions SET status = $1, updated_at = now() WHERE id = $2 RETURNING *",
      [to, id]
    );
    await client.query("INSERT INTO telehealth_events (session_id, actor, type, note) VALUES ($1, $2, $3, $4)", [
      id,
      actor,
      to,
      note ?? null,
    ]);
    const { rows: eventRows } = await client.query("SELECT * FROM telehealth_events WHERE session_id = $1 ORDER BY at ASC", [id]);
    return toTelehealthSession(updatedRows[0], eventRows.map(toEvent));
  });
}
