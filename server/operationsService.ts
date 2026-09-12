import crypto from "crypto";
import fs from "fs";
import path from "path";

const STORE_PATH = path.join(process.cwd(), "server", "data", "operations.json");

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

interface OperationsStore {
  ambulanceUnits: AmbulanceUnitRecord[];
  ambulanceRequests: AmbulanceRequestRecord[];
  telehealthSessions: TelehealthRecord[];
}

let store: OperationsStore = { ambulanceUnits: [], ambulanceRequests: [], telehealthSessions: [] };

function now() {
  return new Date().toISOString();
}

function persist() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  const tempPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(tempPath, STORE_PATH);
}

function event(actor: string, type: string, note?: string): OperationEvent {
  return { at: now(), actor, type, note };
}

export function initOperationsService() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const loaded = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
      store = {
        ambulanceUnits: Array.isArray(loaded.ambulanceUnits) ? loaded.ambulanceUnits : [],
        ambulanceRequests: Array.isArray(loaded.ambulanceRequests) ? loaded.ambulanceRequests : [],
        telehealthSessions: Array.isArray(loaded.telehealthSessions) ? loaded.telehealthSessions : [],
      };
    }
  } catch (error) {
    console.error("[OperationsService] Unable to load operations store:", error);
    store = { ambulanceUnits: [], ambulanceRequests: [], telehealthSessions: [] };
  }
}

export function listOperations() {
  return structuredClone(store);
}

export function registerAmbulanceUnit(input: { id?: string; code: string; status?: AmbulanceUnitRecord["status"] }, actor: string) {
  const code = input.code?.trim().toUpperCase();
  if (!code) throw new Error("Kode unit ambulance wajib diisi.");
  const existing = store.ambulanceUnits.find((unit) => unit.code === code);
  if (existing) return existing;
  const unit: AmbulanceUnitRecord = { id: input.id || crypto.randomUUID(), code, status: input.status || "available", updatedAt: now() };
  store.ambulanceUnits.push(unit);
  persist();
  return unit;
}

export function createAmbulanceRequest(input: Omit<AmbulanceRequestRecord, "id" | "requestNo" | "status" | "createdAt" | "updatedAt" | "events">, actor: string) {
  if (!input.patientName?.trim() || !input.callerName?.trim() || !input.callerPhone?.trim() || !input.pickupAddress?.trim()) {
    throw new Error("Data pasien, pelapor, telepon, dan lokasi penjemputan wajib diisi.");
  }
  if (input.latitude !== undefined && (input.latitude < -90 || input.latitude > 90)) throw new Error("Latitude tidak valid.");
  if (input.longitude !== undefined && (input.longitude < -180 || input.longitude > 180)) throw new Error("Longitude tidak valid.");
  const createdAt = now();
  const request: AmbulanceRequestRecord = {
    ...input,
    id: crypto.randomUUID(),
    requestNo: `AMB-${createdAt.slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    status: "received",
    createdAt,
    updatedAt: createdAt,
    events: [event(actor, "received")],
  };
  store.ambulanceRequests.push(request);
  persist();
  return request;
}

const AMBULANCE_TRANSITIONS: Record<AmbulanceStatus, AmbulanceStatus[]> = {
  received: ["triaged", "cancelled"], triaged: ["assigned", "cancelled"], assigned: ["en_route", "cancelled"],
  en_route: ["arrived", "cancelled"], arrived: ["patient_onboard", "cancelled"], patient_onboard: ["at_clinic"],
  at_clinic: ["handed_over"], handed_over: ["closed"], closed: [], cancelled: [],
};

export function transitionAmbulanceRequest(id: string, to: AmbulanceStatus, actor: string, input: { unitId?: string; note?: string } = {}) {
  const request = store.ambulanceRequests.find((item) => item.id === id);
  if (!request) throw new Error("Permintaan ambulance tidak ditemukan.");
  if (!AMBULANCE_TRANSITIONS[request.status].includes(to)) throw new Error(`Transisi ${request.status} ke ${to} tidak diizinkan.`);
  if (to === "assigned") {
    const unit = store.ambulanceUnits.find((item) => item.id === input.unitId);
    if (!unit || unit.status !== "available") throw new Error("Unit ambulance tidak tersedia.");
    unit.status = "assigned";
    unit.updatedAt = now();
    request.assignedUnitId = unit.id;
  }
  if ((to === "cancelled" || to === "closed") && request.assignedUnitId) {
    const unit = store.ambulanceUnits.find((item) => item.id === request.assignedUnitId);
    if (unit && unit.status === "assigned") {
      unit.status = "available";
      unit.updatedAt = now();
    }
  }
  request.status = to;
  request.updatedAt = now();
  request.events.push(event(actor, to, input.note));
  persist();
  return request;
}

const TELEHEALTH_TRANSITIONS: Record<TelehealthStatus, TelehealthStatus[]> = {
  scheduled: ["waiting_room", "cancelled", "no_show"], waiting_room: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed"], completed: [], cancelled: [], no_show: [],
};

export function createTelehealthSession(input: Omit<TelehealthRecord, "id" | "sessionNo" | "status" | "createdAt" | "updatedAt" | "events">, actor: string) {
  if (!input.patientName?.trim() || !input.customerId?.trim() || !input.doctorId?.trim() || !input.consentAcceptedAt) throw new Error("Pasien, pelanggan, dokter, dan persetujuan telehealth wajib diisi.");
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 15 || input.durationMinutes > 60) throw new Error("Durasi telehealth harus 15–60 menit.");
  if (Number.isNaN(Date.parse(input.scheduledAt))) throw new Error("Jadwal telehealth tidak valid.");
  const conflicting = store.telehealthSessions.some((session) => session.doctorId === input.doctorId && session.scheduledAt === input.scheduledAt && !["cancelled", "no_show"].includes(session.status));
  if (conflicting) throw new Error("Dokter sudah memiliki sesi telehealth pada waktu tersebut.");
  const createdAt = now();
  const session: TelehealthRecord = { ...input, id: crypto.randomUUID(), sessionNo: `TH-${createdAt.slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`, status: "scheduled", createdAt, updatedAt: createdAt, events: [event(actor, "scheduled")] };
  store.telehealthSessions.push(session);
  persist();
  return session;
}

export function transitionTelehealthSession(id: string, to: TelehealthStatus, actor: string, note?: string) {
  const session = store.telehealthSessions.find((item) => item.id === id);
  if (!session) throw new Error("Sesi telehealth tidak ditemukan.");
  if (!TELEHEALTH_TRANSITIONS[session.status].includes(to)) throw new Error(`Transisi ${session.status} ke ${to} tidak diizinkan.`);
  session.status = to;
  session.updatedAt = now();
  session.events.push(event(actor, to, note));
  persist();
  return session;
}
