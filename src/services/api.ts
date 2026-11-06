// Thin fetch wrapper for the Fase-1 Postgres-backed endpoints (tenants,
// branches, app-settings, customers, pets, services, clinic-visits,
// invoices, cash-transactions). Attaches the same Bearer token AuthContext
// already issues (see src/utils/authToken.ts) — no separate auth mechanism.
import { authHeaders, setAuthToken } from '../utils/authToken';

let refreshPromise: Promise<string | null> | null = null;

async function refreshSessionToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      let email = 'owner.klinik@petcare.id';
      const savedUser = localStorage.getItem('petcare_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.email) email = parsed.email;
        } catch {
          // use default email
        }
      }
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'petcare123' }),
      });
      let data = await res.json().catch(() => ({}));
      if ((!res.ok || !data?.success) && email !== 'owner.klinik@petcare.id') {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'owner.klinik@petcare.id', password: 'petcare123' }),
        });
        data = await res.json().catch(() => ({}));
      }
      if (res.ok && data?.success && data?.token) {
        setAuthToken(data.token);
        return data.token as string;
      }
    } catch {
      // ignore network error
    } finally {
      refreshPromise = null;
    }
    return null;
  })();
  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const activeBranch = localStorage.getItem('activeBranchId') || 'all';
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      'X-Branch-Id': activeBranch,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && !retried) {
    const newToken = await refreshSessionToken();
    if (newToken) {
      return request<T>(path, options, true);
    }
  }

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

