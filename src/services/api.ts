// Thin fetch wrapper for the Fase-1 Postgres-backed endpoints (tenants,
// branches, app-settings, customers, pets, services, clinic-visits,
// invoices, cash-transactions). Attaches the same Bearer token AuthContext
// already issues (see src/utils/authToken.ts) — no separate auth mechanism.
import { authHeaders } from '../utils/authToken';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `Permintaan ke ${path} gagal (HTTP ${res.status}).`);
  }
  return body.data as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: (path: string) => request<void>(path, { method: 'DELETE' }),
  /** Upload a base64 data URI to disk; returns the served URL. */
  upload: (dataUri: string, prefix?: string) =>
    request<{ url: string }>('/uploads', { method: 'POST', body: JSON.stringify({ data: dataUri, prefix }) }),
};
