import crypto from "crypto";
import { pool } from "./db";
import { INITIAL_USERS } from "../src/data/mockData";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Seeding only ever runs for accounts that don't exist yet in the `users`
// table (ON CONFLICT DO NOTHING below) — it never touches an account that
// already has a password/PIN hash. That means changing these defaults is
// safe for an already-running deployment: it does NOT retroactively change
// any credential already issued. It only affects brand-new accounts seeded
// from here on (a fresh install, or a new employee added to INITIAL_USERS).
//
// IMPORTANT: this app was previously seeded with a shared hardcoded
// password ("petcare123") and predictable 4-digit PINs (1234, 0000, ...)
// for every account in INITIAL_USERS. If this app is already deployed,
// those specific credentials are still active on every account that hasn't
// had its password/PIN changed since — fixing the code here does not fix
// already-issued credentials. Rotate them for existing accounts via
// setPassword()/setPin() (e.g. by having each user use "lupa kata sandi" or
// "ganti PIN"), or with a one-off admin script.
//
// SEED_DEFAULT_PASSWORD / SEED_DEFAULT_PINS let an operator pin these to a
// known value for a fresh install (e.g. to hand out temporary credentials).
// When unset, a random password/PIN is generated per user at boot and
// printed once to the server log so whoever runs the first deploy can
// capture and distribute it — nothing weak or predictable ships as a
// fallback.
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || null;

let SEED_DEFAULT_PINS: Record<string, string> = {};
if (process.env.SEED_DEFAULT_PINS) {
  try {
    SEED_DEFAULT_PINS = JSON.parse(process.env.SEED_DEFAULT_PINS);
  } catch {
    console.warn("[AuthService] SEED_DEFAULT_PINS bukan JSON yang valid, diabaikan.");
  }
}

function randomPassword(): string {
  return crypto.randomBytes(9).toString("base64url"); // 12 chars, URL-safe
}

function randomPin(): string {
  return String(crypto.randomInt(0, 10000)).padStart(4, "0");
}

interface ResetTokenEntry {
  email: string;
  expiresAt: number;
}

// Reset tokens are short-lived (30min) and only meaningful for the process
// that issued them — in-memory is an intentional trade-off, same as
// server/sessionService.ts, not something that needs a database.
const resetTokens = new Map<string, ResetTokenEntry>();
let cleanupInterval: NodeJS.Timeout | null = null;

function hashPassword(plainPassword: string, salt: string = crypto.randomBytes(16).toString("hex")): string {
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyHash(plainPassword: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

/**
 * Seed the `users` table from INITIAL_USERS on first boot (profile + a
 * default password/PIN hash), same "seed once if missing" behavior the old
 * file-backed store had. Existing rows (and any password/PIN already set)
 * are left untouched.
 */
export async function initAuthService() {
  const { rows: branchRows } = await pool.query<{ id: string; legacy_id: string }>(
    "SELECT id, legacy_id FROM branches WHERE legacy_id IS NOT NULL"
  );
  const branchIdByLegacy = new Map(branchRows.map((r) => [r.legacy_id, r.id]));

  // Credentials generated for genuinely NEW accounts this boot (not accounts
  // that already existed) get logged once below, so whoever runs the first
  // deploy can capture and hand them out — they're never recoverable after
  // this, only resettable via "lupa kata sandi" / "ganti PIN".
  const issuedCredentials: { email: string; password?: string; pin: string }[] = [];

  for (const u of INITIAL_USERS) {
    const email = u.email.toLowerCase();
    const branchId = u.branchId && branchIdByLegacy.has(u.branchId) ? branchIdByLegacy.get(u.branchId)! : null;
    const password = DEFAULT_PASSWORD || randomPassword();
    const pin = SEED_DEFAULT_PINS[email] || randomPin();
    const result = await pool.query(
      `INSERT INTO users (legacy_id, email, name, role, ownership_type, branch_id, branch_name, active, password_hash, pin_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO NOTHING`,
      [
        u.id,
        email,
        u.name,
        u.role,
        u.ownershipType || null,
        branchId,
        u.branchName || null,
        u.active,
        hashPassword(password),
        hashPassword(pin),
      ]
    );
    if ((result.rowCount ?? 0) > 0) {
      issuedCredentials.push({ email, password: DEFAULT_PASSWORD ? undefined : password, pin });
    }
  }

  if (issuedCredentials.length > 0) {
    console.log(
      `[AuthService] 🔑 ${issuedCredentials.length} akun baru di-seed dengan kredensial berikut (dicetak SEKALI, catat sekarang):`
    );
    for (const c of issuedCredentials) {
      const passwordNote = c.password ? `password=${c.password}` : "password=(dari SEED_DEFAULT_PASSWORD)";
      console.log(`[AuthService]   ${c.email} — ${passwordNote} pin=${c.pin}`);
    }
  }

  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

  const { rows: countRows } = await pool.query<{ count: string }>("SELECT count(*)::text FROM users");
  console.log(`[AuthService] 🔐 Postgres user/PIN store ready (${countRows[0].count} akun).`);
}

export async function verifyPassword(email: string, plainPassword: string): Promise<boolean> {
  const { rows } = await pool.query<{ password_hash: string | null }>(
    "SELECT password_hash FROM users WHERE lower(email) = lower($1)",
    [email]
  );
  return verifyHash(plainPassword, rows[0]?.password_hash ?? null);
}

export async function setPassword(email: string, plainPassword: string): Promise<void> {
  await pool.query("UPDATE users SET password_hash = $1 WHERE lower(email) = lower($2)", [
    hashPassword(plainPassword),
    email,
  ]);
}

export async function userExists(email: string): Promise<boolean> {
  const { rows } = await pool.query("SELECT 1 FROM users WHERE lower(email) = lower($1)", [email]);
  return rows.length > 0;
}

export async function verifyPin(email: string, plainPin: string): Promise<boolean> {
  const { rows } = await pool.query<{ pin_hash: string | null }>(
    "SELECT pin_hash FROM users WHERE lower(email) = lower($1)",
    [email]
  );
  return verifyHash(plainPin, rows[0]?.pin_hash ?? null);
}

export async function setPin(email: string, plainPin: string): Promise<void> {
  await pool.query("UPDATE users SET pin_hash = $1 WHERE lower(email) = lower($2)", [hashPassword(plainPin), email]);
}

/**
 * Find the account whose PIN matches (used for the PIN-only fast shift
 * login, where the caller doesn't know which email to check yet). Returns
 * the matching email in lowercase, or null. O(n) over a small demo roster.
 */
export async function findAccountByPin(plainPin: string): Promise<string | null> {
  const { rows } = await pool.query<{ email: string; pin_hash: string | null }>("SELECT email, pin_hash FROM users");
  for (const row of rows) {
    if (verifyHash(plainPin, row.pin_hash)) return row.email;
  }
  return null;
}

export interface AccountInfo {
  email: string;
  name: string;
  role: string;
  ownershipType?: string;
  branchId?: string;
  branchName?: string;
}

/**
 * Server-side source of truth for who a given account actually is — the
 * client must never be trusted to declare its own role/ownership.
 */
export async function getAccountInfo(email: string): Promise<AccountInfo | null> {
  const { rows } = await pool.query<{
    email: string;
    name: string;
    role: string;
    ownership_type: string | null;
    branch_id: string | null;
    branch_name: string | null;
  }>("SELECT email, name, role, ownership_type, branch_id, branch_name FROM users WHERE lower(email) = lower($1)", [
    email,
  ]);
  const found = rows[0];
  if (!found) return null;
  return {
    email: found.email,
    name: found.name,
    role: found.role,
    ownershipType: found.ownership_type || undefined,
    branchId: found.branch_id || undefined,
    branchName: found.branch_name || undefined,
  };
}

export function createResetToken(email: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  resetTokens.set(token, { email: email.toLowerCase(), expiresAt: Date.now() + RESET_TOKEN_TTL_MS });
  return token;
}

/**
 * Validate and consume a reset token (single use). Returns the associated
 * email if the token is valid and not expired, otherwise null.
 */
export function consumeResetToken(token: string): string | null {
  const entry = resetTokens.get(token);
  if (!entry) return null;
  resetTokens.delete(token);
  if (Date.now() > entry.expiresAt) return null;
  return entry.email;
}

export function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, entry] of resetTokens.entries()) {
    if (now > entry.expiresAt) resetTokens.delete(token);
  }
}
