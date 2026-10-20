import crypto from "crypto";
import { pool } from "./db";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface SessionEntry {
  email: string;
  role: string;
  ownershipType?: string;
  expiresAt: number;
}

export function initSessionService() {
  // Purge expired rows from DB every 5 minutes
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
}

export async function createSession(email: string, role: string, ownershipType?: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(
    "INSERT INTO sessions (token, email, role, ownership_type, expires_at) VALUES ($1, $2, $3, $4, $5)",
    [token, email.toLowerCase(), role, ownershipType ?? null, expiresAt]
  );
  return token;
}

export async function getSession(token: string | undefined | null): Promise<SessionEntry | null> {
  if (!token) return null;
  const { rows } = await pool.query<{ email: string; role: string; ownership_type: string | null; expires_at: Date }>(
    "SELECT email, role, ownership_type, expires_at FROM sessions WHERE token = $1",
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  if (Date.now() > row.expires_at.getTime()) {
    await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
    return null;
  }
  return { email: row.email, role: row.role, ownershipType: row.ownership_type ?? undefined, expiresAt: row.expires_at.getTime() };
}

export async function destroySession(token: string | undefined | null) {
  if (!token) return;
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}

export async function cleanupExpiredSessions() {
  await pool.query("DELETE FROM sessions WHERE expires_at < now()");
}
