import { authHeaders } from './authToken';

type AmbulanceStatus = 'received' | 'triaged' | 'assigned' | 'en_route' | 'arrived' | 'patient_onboard' | 'at_clinic' | 'handed_over' | 'closed' | 'cancelled';
type TelehealthStatus = 'scheduled' | 'waiting_room' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function request<T>(url: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => ({})) as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new Error(payload.message || 'Operasi server gagal diproses.');
  return payload.data;
}

export interface OperationAmbulanceUnit { id: string; code: string; status: 'available' | 'assigned' | 'maintenance'; }
export interface OperationAmbulanceRequest { id: string; status: AmbulanceStatus; assignedUnitId?: string; }
export interface OperationTelehealthSession { id: string; status: TelehealthStatus; }

export function registerOperationAmbulanceUnit(input: { id: string; code: string }) {
  return request<OperationAmbulanceUnit>('/api/operations/ambulance/units', 'POST', input);
}

export function createOperationAmbulanceRequest(input: {
  patientName: string; callerName: string; callerPhone: string; urgency: 'emergency' | 'urgent' | 'normal'; pickupAddress: string; notes?: string;
}) {
  return request<OperationAmbulanceRequest>('/api/operations/ambulance/requests', 'POST', input);
}

export function transitionOperationAmbulanceRequest(id: string, status: AmbulanceStatus, input: { unitId?: string; note?: string } = {}) {
  return request<OperationAmbulanceRequest>(`/api/operations/ambulance/requests/${id}/transition`, 'POST', { status, ...input });
}

export function createOperationTelehealthSession(input: {
  patientName: string; customerId: string; doctorId: string; scheduledAt: string; durationMinutes: number; consentAcceptedAt: string;
}) {
  return request<OperationTelehealthSession>('/api/operations/telehealth/sessions', 'POST', input);
}

export function transitionOperationTelehealthSession(id: string, status: TelehealthStatus, note?: string) {
  return request<OperationTelehealthSession>(`/api/operations/telehealth/sessions/${id}/transition`, 'POST', { status, note });
}
