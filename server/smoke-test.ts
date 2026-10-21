/**
 * Minimal smoke tests — run with: tsx server/smoke-test.ts
 * Requires the app server to be running on PORT (default 3000).
 * Tests: auth flow, core CRUD, ambulance operations, backup integrity.
 */

const BASE = `http://localhost:${process.env.PORT || 3000}/api`;
let passed = 0;
let failed = 0;
let token = "";

async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

function assert(label: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.error(`  ✗ ${label}${detail ? `: ${detail}` : ""}`); }
}

async function run() {
  console.log(`\n🔍 PetCare Smoke Tests → ${BASE}\n`);

  // ── Auth ──────────────────────────────────────────────────────────────────
  console.log("Auth");
  const login = await req("POST", "/auth/login", { email: "admin@petcare.id", password: "wrong" });
  assert("login with bad password returns 401", login.status === 401 || login.body?.success === false);

  const goodLogin = await req("POST", "/auth/login", { email: "owner@petcare.id", password: "petcare123" });
  assert("login with correct password succeeds", goodLogin.status === 200 && goodLogin.body?.success === true, JSON.stringify(goodLogin.body));
  token = goodLogin.body?.data?.token ?? "";
  assert("login returns session token", token.length > 0);

  const me = await req("GET", "/auth/me");
  assert("GET /auth/me returns user", me.status === 200 && !!me.body?.data?.email);

  // ── Core data reads ───────────────────────────────────────────────────────
  console.log("\nCore data");
  const customers = await req("GET", "/customers");
  assert("GET /customers 200", customers.status === 200);
  assert("customers returns array", Array.isArray(customers.body?.data));

  const pets = await req("GET", "/pets");
  assert("GET /pets 200", pets.status === 200 && Array.isArray(pets.body?.data));

  const stockItems = await req("GET", "/stock-items");
  assert("GET /stock-items 200", stockItems.status === 200 && Array.isArray(stockItems.body?.data));

  const employees = await req("GET", "/employees");
  assert("GET /employees 200", employees.status === 200 && Array.isArray(employees.body?.data));

  // ── Ambulance operations ──────────────────────────────────────────────────
  console.log("\nAmbulance");
  const ops = await req("GET", "/operations");
  assert("GET /operations 200", ops.status === 200);
  assert("operations returns ambulanceUnits array", Array.isArray(ops.body?.data?.ambulanceUnits));

  const units = await req("GET", "/ambulance-units");
  assert("GET /ambulance-units 200", units.status === 200 && Array.isArray(units.body?.data));
  assert("ambulance fleet seeded (≥1 unit)", (units.body?.data?.length ?? 0) >= 1,
    `found ${units.body?.data?.length} units`);

  // ── Backup ────────────────────────────────────────────────────────────────
  console.log("\nBackup");
  const backupStatus = await req("GET", "/backup/status");
  assert("GET /backup/status 200", backupStatus.status === 200);
  assert("backup daemon running", backupStatus.body?.data?.isDaemonRunning === true);

  const auditLogs = await req("GET", "/audit-logs");
  assert("GET /audit-logs 200", auditLogs.status === 200 && Array.isArray(auditLogs.body?.data));

  // ── Logout ────────────────────────────────────────────────────────────────
  console.log("\nSession");
  const logout = await req("POST", "/auth/logout");
  assert("POST /auth/logout 200", logout.status === 200 && logout.body?.success === true);
  const afterLogout = await req("GET", "/customers");
  assert("requests after logout return 401", afterLogout.status === 401);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => { console.error("Smoke test runner error:", err); process.exit(1); });
