import crypto from "crypto";
import fs from "fs";
import path from "path";
import { INITIAL_USERS } from "../src/data/mockData";

const USERS_DATA_PATH = path.join(process.cwd(), "server", "data", "users.json");
const DEFAULT_PASSWORD = "petcare123";
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface ResetTokenEntry {
  email: string;
  expiresAt: number;
}

// email (lowercase) -> "salt:hash"
let passwordStore: Record<string, string> = {};
const resetTokens = new Map<string, ResetTokenEntry>();
let cleanupInterval: NodeJS.Timeout | null = null;

function hashPassword(plainPassword: string, salt: string = crypto.randomBytes(16).toString("hex")): string {
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyHash(plainPassword: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

function persistPasswordStore() {
  fs.mkdirSync(path.dirname(USERS_DATA_PATH), { recursive: true });
  fs.writeFileSync(USERS_DATA_PATH, JSON.stringify(passwordStore, null, 2), "utf8");
}

/**
 * Load password store from disk, or seed every known demo user with the
 * default password on first run.
 */
export function initAuthService() {
  try {
    if (fs.existsSync(USERS_DATA_PATH)) {
      passwordStore = JSON.parse(fs.readFileSync(USERS_DATA_PATH, "utf8"));
    }
  } catch (err) {
    console.error("[AuthService] Failed to read users.json, reseeding:", err);
    passwordStore = {};
  }

  let seeded = false;
  for (const u of INITIAL_USERS) {
    const key = u.email.toLowerCase();
    if (!passwordStore[key]) {
      passwordStore[key] = hashPassword(DEFAULT_PASSWORD);
      seeded = true;
    }
  }
  if (seeded) {
    persistPasswordStore();
  }

  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

  console.log(`[AuthService] 🔐 Password store ready (${Object.keys(passwordStore).length} accounts).`);
}

export function verifyPassword(email: string, plainPassword: string): boolean {
  const stored = passwordStore[email.toLowerCase()];
  if (!stored) return false;
  return verifyHash(plainPassword, stored);
}

export function setPassword(email: string, plainPassword: string) {
  passwordStore[email.toLowerCase()] = hashPassword(plainPassword);
  persistPasswordStore();
}

export function userExists(email: string): boolean {
  return !!passwordStore[email.toLowerCase()];
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
