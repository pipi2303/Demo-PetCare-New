import crypto from "crypto";
import fs from "fs";
import path from "path";
import { INITIAL_USERS } from "../src/data/mockData";

const USERS_DATA_PATH = path.join(process.cwd(), "server", "data", "users.json");
const PINS_DATA_PATH = path.join(process.cwd(), "server", "data", "pins.json");
const DEFAULT_PASSWORD = "petcare123";
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Demo shift PINs, server-side only — never shipped to the client bundle
// (mockData.ts, which IS imported by client code, intentionally has no `pin`
// field anymore). Seeded once on first boot, then only the hash persists.
const DEFAULT_PINS: Record<string, string> = {
  "owner.klinik@petcare.id": "1234",
  "owner.petshop@petcare.id": "5678",
  "owner.petcare@petcare.id": "9999",
  "owner@petcare.id": "1234",
  "ananda@petcare.id": "2222",
  "ani@petcare.id": "3333",
  "binta@petcare.id": "4444",
  "admin@petcare.id": "5555",
  "superadmin@petcare.co.id": "0000",
  "andri@email.com": "7777",
  "dewi@email.com": "8888",
};

interface ResetTokenEntry {
  email: string;
  expiresAt: number;
}

// email (lowercase) -> "salt:hash"
let passwordStore: Record<string, string> = {};
// email (lowercase) -> "salt:hash" of a 4-digit shift PIN
let pinStore: Record<string, string> = {};
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

function persistPinStore() {
  fs.mkdirSync(path.dirname(PINS_DATA_PATH), { recursive: true });
  fs.writeFileSync(PINS_DATA_PATH, JSON.stringify(pinStore, null, 2), "utf8");
}

/**
 * Load password/PIN stores from disk, or seed every known demo user with the
 * default password/PIN on first run.
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

  try {
    if (fs.existsSync(PINS_DATA_PATH)) {
      pinStore = JSON.parse(fs.readFileSync(PINS_DATA_PATH, "utf8"));
    }
  } catch (err) {
    console.error("[AuthService] Failed to read pins.json, reseeding:", err);
    pinStore = {};
  }

  let seeded = false;
  let pinsSeeded = false;
  for (const u of INITIAL_USERS) {
    const key = u.email.toLowerCase();
    if (!passwordStore[key]) {
      passwordStore[key] = hashPassword(DEFAULT_PASSWORD);
      seeded = true;
    }
    if (!pinStore[key]) {
      const defaultPin = DEFAULT_PINS[key] || "1234";
      pinStore[key] = hashPassword(defaultPin);
      pinsSeeded = true;
    }
  }
  if (seeded) {
    persistPasswordStore();
  }
  if (pinsSeeded) {
    persistPinStore();
  }

  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

  console.log(`[AuthService] 🔐 Password store ready (${Object.keys(passwordStore).length} accounts).`);
  console.log(`[AuthService] 🔢 PIN store ready (${Object.keys(pinStore).length} accounts).`);
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

export function verifyPin(email: string, plainPin: string): boolean {
  const stored = pinStore[email.toLowerCase()];
  if (!stored) return false;
  return verifyHash(plainPin, stored);
}

export function setPin(email: string, plainPin: string) {
  pinStore[email.toLowerCase()] = hashPassword(plainPin);
  persistPinStore();
}

/**
 * Find the account whose PIN matches (used for the PIN-only fast shift
 * login, where the caller doesn't know which email to check yet). Returns
 * the matching email in lowercase, or null. O(n) over a small demo roster.
 */
export function findAccountByPin(plainPin: string): string | null {
  for (const email of Object.keys(pinStore)) {
    if (verifyHash(plainPin, pinStore[email])) return email;
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
export function getAccountInfo(email: string): AccountInfo | null {
  const found = INITIAL_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!found) return null;
  return {
    email: found.email,
    name: found.name,
    role: found.role,
    ownershipType: found.ownershipType,
    branchId: found.branchId,
    branchName: found.branchName,
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
