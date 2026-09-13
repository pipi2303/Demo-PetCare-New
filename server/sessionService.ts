import crypto from "crypto";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface SessionEntry {
  email: string;
  role: string;
  ownershipType?: string;
  expiresAt: number;
}

// token -> session entry. In-memory only (single-process demo server) — a
// restart forces re-login, which is an acceptable trade-off here since this
// is not backed by a real session store/DB yet.
const sessions = new Map<string, SessionEntry>();
let cleanupInterval: NodeJS.Timeout | null = null;

export function initSessionService() {
  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
}

export function createSession(email: string, role: string, ownershipType?: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    email: email.toLowerCase(),
    role,
    ownershipType,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

export function getSession(token: string | undefined | null): SessionEntry | null {
  if (!token) return null;
  const entry = sessions.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return entry;
}

export function destroySession(token: string | undefined | null) {
  if (!token) return;
  sessions.delete(token);
}

export function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, entry] of sessions.entries()) {
    if (now > entry.expiresAt) sessions.delete(token);
  }
}
