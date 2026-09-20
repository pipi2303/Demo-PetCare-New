import { pool } from "./db";
import {
  INITIAL_TENANTS,
  INITIAL_BRANCHES,
  INITIAL_CUSTOMERS,
  INITIAL_PETS,
  INITIAL_SERVICES,
  INITIAL_CLINIC_VISITS,
  INITIAL_INVOICES,
  INITIAL_CASH_TRANSACTIONS,
  DEFAULT_APP_SETTINGS,
} from "../src/data/mockData";

async function isEmpty(table: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
  return rows.length === 0;
}

async function legacyIdMap(table: string): Promise<Map<string, string>> {
  const { rows } = await pool.query<{ id: string; legacy_id: string }>(
    `SELECT id, legacy_id FROM ${table} WHERE legacy_id IS NOT NULL`
  );
  return new Map(rows.map((r) => [r.legacy_id, r.id]));
}

/**
 * Fresh-start seed for the Fase-1 core tables (tenants/branches/app_settings,
 * customers, pets, services, clinic_visits, invoices, cash_transactions),
 * sourced from src/data/mockData.ts — mirrors what DataContext.tsx used to
 * seed into localStorage. Runs once: every block is a no-op once its table
 * already has rows, so re-running on every boot is safe.
 */
export async function seedIfEmpty() {
  if (await isEmpty("tenants")) {
    for (const t of INITIAL_TENANTS) {
      await pool.query(
        `INSERT INTO tenants (legacy_id, name, code, plan, status, owner_name, phone, email, created_at, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [t.id, t.name, t.code, t.plan, t.status, t.ownerName, t.phone, t.email, t.createdAt, t.expiresAt]
      );
    }
    console.log(`[Seed] tenants: ${INITIAL_TENANTS.length} baris.`);
  }

  if (await isEmpty("branches")) {
    for (const b of INITIAL_BRANCHES) {
      await pool.query(
        `INSERT INTO branches (legacy_id, name, code, address, phone, email, is_active, is_main_branch)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [b.id, b.name, b.code, b.address, b.phone, b.email, b.isActive, !!b.isMainBranch]
      );
    }
    console.log(`[Seed] branches: ${INITIAL_BRANCHES.length} baris.`);
  }

  const tenantIds = await legacyIdMap("tenants");
  if ((await isEmpty("app_settings")) && tenantIds.size > 0) {
    const firstTenantId = tenantIds.values().next().value;
    await pool.query("INSERT INTO app_settings (tenant_id, settings) VALUES ($1, $2)", [
      firstTenantId,
      JSON.stringify(DEFAULT_APP_SETTINGS),
    ]);
    console.log("[Seed] app_settings: 1 baris.");
  }

  if (await isEmpty("customers")) {
    for (const c of INITIAL_CUSTOMERS) {
      await pool.query(
        `INSERT INTO customers (legacy_id, name, phone, email, address, nik, gender, membership_tier, loyalty_points, total_spent, pet_count, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          c.id,
          c.name,
          c.phone,
          c.email,
          c.address,
          c.nik ?? null,
          c.gender ?? null,
          c.membershipTier,
          c.loyaltyPoints,
          c.totalSpent,
          c.petCount,
          c.createdAt,
        ]
      );
    }
    console.log(`[Seed] customers: ${INITIAL_CUSTOMERS.length} baris.`);
  }

  const customerIds = await legacyIdMap("customers");
  if (await isEmpty("pets")) {
    for (const p of INITIAL_PETS) {
      const customerId = customerIds.get(p.customerId);
      if (!customerId) continue;
      await pool.query(
        `INSERT INTO pets (legacy_id, customer_id, name, species, breed, color, gender, sterilized, birth_date, weight_kg, microchip_no, allergies, notes, photo_url, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          p.id,
          customerId,
          p.name,
          p.species,
          p.breed,
          p.color,
          p.gender,
          p.sterilized,
          p.birthDate,
          p.weightKg,
          p.microchipNo ?? null,
          p.allergies ?? null,
          p.notes ?? null,
          p.photoUrl ?? null,
          p.createdAt,
        ]
      );
    }
    console.log(`[Seed] pets: ${INITIAL_PETS.length} baris.`);
  }

  if (await isEmpty("services")) {
    for (const s of INITIAL_SERVICES) {
      await pool.query(
        `INSERT INTO services (legacy_id, code, name, category, estimated_duration_mins, price, description, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [s.id, s.code, s.name, s.category, s.estimatedDurationMins, s.price, s.description ?? null, s.isActive]
      );
    }
    console.log(`[Seed] services: ${INITIAL_SERVICES.length} baris.`);
  }

  const petIds = await legacyIdMap("pets");
  const branchIds = await legacyIdMap("branches");
  if (await isEmpty("clinic_visits")) {
    for (const v of INITIAL_CLINIC_VISITS) {
      const customerId = customerIds.get(v.customerId);
      const petId = petIds.get(v.petId);
      if (!customerId || !petId) continue;
      await pool.query(
        `INSERT INTO clinic_visits (legacy_id, visit_no, queue_no, customer_id, pet_id, doctor_id, doctor_name, complaint, status, branch_id, queued_at, called_at, examined_at, completed_at, sla_minutes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          v.id,
          v.visitNo,
          v.queueNo,
          customerId,
          petId,
          v.doctorId || null,
          v.doctorName || null,
          v.complaint,
          v.status,
          v.branchId ? branchIds.get(v.branchId) || null : null,
          v.queuedAt || null,
          v.calledAt || null,
          v.examinedAt || null,
          v.completedAt || null,
          v.slaMinutes ?? null,
        ]
      );
    }
    console.log(`[Seed] clinic_visits: ${INITIAL_CLINIC_VISITS.length} baris.`);
  }

  if (await isEmpty("invoices")) {
    for (const inv of INITIAL_INVOICES) {
      const customerId = customerIds.get(inv.customerId);
      if (!customerId) continue;
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO invoices (legacy_id, invoice_no, customer_id, pet_name, date, subtotal, discount_amount, total_amount, paid_amount, payment_method, status, loyalty_points_earned, cashier_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [
          inv.id,
          inv.invoiceNo,
          customerId,
          inv.petName ?? null,
          inv.date,
          inv.subtotal,
          inv.discountAmount,
          inv.totalAmount,
          inv.paidAmount,
          inv.paymentMethod,
          inv.status,
          inv.loyaltyPointsEarned,
          inv.cashierName,
        ]
      );
      const invoiceId = rows[0].id;
      for (const item of inv.items) {
        await pool.query(
          `INSERT INTO invoice_items (invoice_id, category, name, quantity, unit_price, total_price) VALUES ($1,$2,$3,$4,$5,$6)`,
          [invoiceId, item.category, item.name, item.quantity, item.unitPrice, item.totalPrice]
        );
      }
    }
    console.log(`[Seed] invoices: ${INITIAL_INVOICES.length} baris.`);
  }

  if (await isEmpty("cash_transactions")) {
    for (const ct of INITIAL_CASH_TRANSACTIONS) {
      await pool.query(
        `INSERT INTO cash_transactions (legacy_id, trans_no, type, category, amount, occurred_at, description, reference_no, operator)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [ct.id, ct.transNo, ct.type, ct.category, ct.amount, ct.date, ct.description, ct.referenceNo ?? null, ct.operator]
      );
    }
    console.log(`[Seed] cash_transactions: ${INITIAL_CASH_TRANSACTIONS.length} baris.`);
  }
}
