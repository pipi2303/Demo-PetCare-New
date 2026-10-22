import { pool } from "./db";
import {
  INITIAL_TENANTS, INITIAL_BRANCHES, INITIAL_CUSTOMERS, INITIAL_PETS,
  INITIAL_SERVICES, INITIAL_CLINIC_VISITS, INITIAL_INVOICES, INITIAL_CASH_TRANSACTIONS,
  INITIAL_SYSTEM_GROUPS, INITIAL_CUSTOMER_TIER_GROUPS, DEFAULT_APP_SETTINGS,
  // Phase 2-5 master data
  INITIAL_PRODUCT_CATEGORIES, INITIAL_WAREHOUSES,
  INITIAL_DRUGS, INITIAL_SUPPLIERS, INITIAL_STOCK_ITEMS, INITIAL_STOCK_MOVEMENTS,
  INITIAL_PURCHASE_ORDERS, INITIAL_EMPLOYEES, INITIAL_ABSENCE_RECORDS, INITIAL_LEAVE_REQUESTS,
  INITIAL_GROOMING_PACKAGES, INITIAL_HOTEL_ROOMS,
  INITIAL_REMINDERS, INITIAL_LOYALTY_ENTRIES, INITIAL_CARE_PLANS,
  INITIAL_EFORM_TEMPLATES, INITIAL_EFORM_SUBMISSIONS,
  INITIAL_VAC_SCHEDULES, INITIAL_VAC_HISTORIES, INITIAL_SURGICAL_PROCEDURES,
  INITIAL_SOAP_NOTES, INITIAL_LAB_TESTS,
  INITIAL_AMBULANCE_UNITS, INITIAL_AMBULANCE_REQUESTS, INITIAL_PATIENT_PHOTOS,
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

  // ── Phase 2-5: Inventory, HR, Grooming, Hotel, Medical, CRM ────────────────
  if (await isEmpty("product_categories")) {
    for (const c of INITIAL_PRODUCT_CATEGORIES)
      await pool.query("INSERT INTO product_categories (name) VALUES ($1)", [c.name]);
    console.log(`[Seed] product_categories: ${INITIAL_PRODUCT_CATEGORIES.length} kategori.`);
  }

  if (await isEmpty("warehouses")) {
    for (const w of INITIAL_WAREHOUSES)
      await pool.query("INSERT INTO warehouses (name) VALUES ($1)", [w.name]);
    console.log(`[Seed] warehouses: ${INITIAL_WAREHOUSES.length} gudang.`);
  }

  if (await isEmpty("drugs")) {
    for (const d of INITIAL_DRUGS)
      await pool.query(
        "INSERT INTO drugs (code, name, category, unit, stock, min_stock, unit_price, batch_number, expiry_date, location) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [d.code, d.name, d.category, d.unit, d.stock, d.minStock, d.unitPrice, d.batchNumber, d.expiryDate || null, d.location]
      );
    console.log(`[Seed] drugs: ${INITIAL_DRUGS.length} obat.`);
  }

  if (await isEmpty("suppliers")) {
    for (const s of INITIAL_SUPPLIERS)
      await pool.query(
        "INSERT INTO suppliers (code, name, contact_person, phone, email, address, category) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [s.code, s.name, s.contactPerson, s.phone, s.email, s.address, s.category]
      );
    console.log(`[Seed] suppliers: ${INITIAL_SUPPLIERS.length} supplier.`);
  }

  if (await isEmpty("stock_items")) {
    for (const s of INITIAL_STOCK_ITEMS)
      await pool.query(
        "INSERT INTO stock_items (sku, name, category, warehouse, stock, min_stock, unit, purchase_price, selling_price, supplier_name, expiry_date, batch_number) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
        [s.sku, s.name, s.category, s.warehouse, s.stock, s.minStock, s.unit, s.purchasePrice, s.sellingPrice, s.supplierName, s.expiryDate || null, s.batchNumber || null]
      );
    console.log(`[Seed] stock_items: ${INITIAL_STOCK_ITEMS.length} item.`);
    // Stock movements (depend on stock_items)
    const skuMap = new Map<string, string>();
    (await pool.query("SELECT id, sku FROM stock_items")).rows.forEach((r: any) => skuMap.set(r.sku, r.id));
    for (const m of INITIAL_STOCK_MOVEMENTS) {
      const si = INITIAL_STOCK_ITEMS.find((s) => s.id === m.itemId);
      const itemId = si ? skuMap.get(si.sku) : null;
      await pool.query(
        "INSERT INTO stock_movements (item_id, item_name, type, quantity, from_warehouse, to_warehouse, reference_no, date, operator) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [itemId || null, m.itemName, m.type, m.quantity, m.fromWarehouse || null, m.toWarehouse || null, m.referenceNo, m.date, m.operator]
      );
    }
    console.log(`[Seed] stock_movements: ${INITIAL_STOCK_MOVEMENTS.length} mutasi.`);
  }

  if (await isEmpty("purchase_orders")) {
    for (const p of INITIAL_PURCHASE_ORDERS)
      await pool.query(
        "INSERT INTO purchase_orders (po_no, supplier_name, date, status, items, total_amount, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [p.poNo, p.supplierName, p.date, p.status, JSON.stringify(p.items), p.totalAmount, p.notes || null]
      );
    console.log(`[Seed] purchase_orders: ${INITIAL_PURCHASE_ORDERS.length} PO.`);
  }

  if (await isEmpty("employees")) {
    for (const e of INITIAL_EMPLOYEES)
      await pool.query(
        "INSERT INTO employees (nik, name, role, department, phone, email, hire_date, sip_number, base_salary, commission_rate_percent, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
        [e.nik, e.name, e.role, e.department, e.phone, e.email, e.hireDate, e.sipNumber || null, e.baseSalary, e.commissionRatePercent, e.status]
      );
    console.log(`[Seed] employees: ${INITIAL_EMPLOYEES.length} karyawan.`);
    // Build NIK→UUID map for absence/leave FKs
    const nikMap = new Map<string, string>();
    (await pool.query("SELECT id, nik FROM employees")).rows.forEach((r: any) => nikMap.set(r.nik, r.id));
    const empLegacy = new Map<string, string>(); // legacy id → uuid by order
    INITIAL_EMPLOYEES.forEach((e, i) => {
      const uuid = nikMap.get(e.nik);
      if (uuid) empLegacy.set(e.id, uuid);
    });
    for (const a of INITIAL_ABSENCE_RECORDS)
      await pool.query(
        "INSERT INTO absence_records (employee_id, employee_name, date, check_in, check_out, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [empLegacy.get(a.employeeId) || null, a.employeeName, a.date, a.checkIn, a.checkOut || null, a.status, a.notes || null]
      );
    for (const l of INITIAL_LEAVE_REQUESTS)
      await pool.query(
        "INSERT INTO leave_requests (employee_id, employee_name, leave_type, start_date, end_date, total_days, reason, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [empLegacy.get(l.employeeId) || null, l.employeeName, l.leaveType, l.startDate, l.endDate, l.totalDays, l.reason, l.status]
      );
    console.log(`[Seed] absence_records: ${INITIAL_ABSENCE_RECORDS.length}, leave_requests: ${INITIAL_LEAVE_REQUESTS.length}.`);
  }

  if (await isEmpty("grooming_packages")) {
    for (const g of INITIAL_GROOMING_PACKAGES)
      await pool.query(
        "INSERT INTO grooming_packages (name, package_type, price_small, price_medium, price_large, estimated_duration_mins, description, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [g.name, g.packageType, g.priceSmall, g.priceMedium, g.priceLarge, g.estimatedDurationMins, g.description || null, g.isActive]
      );
    console.log(`[Seed] grooming_packages: ${INITIAL_GROOMING_PACKAGES.length} paket.`);
  }

  if (await isEmpty("hotel_rooms")) {
    for (const r of INITIAL_HOTEL_ROOMS)
      await pool.query(
        "INSERT INTO hotel_rooms (room_no, room_type, capacity, daily_rate, is_active, notes) VALUES ($1,$2,$3,$4,$5,$6)",
        [r.roomNo, r.roomType, r.capacity, r.dailyRate, r.isActive, r.notes || null]
      );
    console.log(`[Seed] hotel_rooms: ${INITIAL_HOTEL_ROOMS.length} kamar.`);
  }

  if (await isEmpty("reminders")) {
    for (const r of INITIAL_REMINDERS)
      await pool.query(
        "INSERT INTO reminders (customer_name, customer_phone, pet_name, title, type, due_date, status) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [r.customerName, r.customerPhone, r.petName, r.title, r.type, r.dueDate, r.status]
      );
    console.log(`[Seed] reminders: ${INITIAL_REMINDERS.length} pengingat.`);
  }

  if (await isEmpty("eform_templates")) {
    for (const t of INITIAL_EFORM_TEMPLATES)
      await pool.query(
        "INSERT INTO eform_templates (title, category, description, fields) VALUES ($1,$2,$3,$4)",
        [t.title, t.category, t.description, JSON.stringify(t.fields)]
      );
    console.log(`[Seed] eform_templates: ${INITIAL_EFORM_TEMPLATES.length} template.`);
    // Eform submissions (depend on templates)
    const tplMap = new Map<string, string>();
    (await pool.query("SELECT id, title FROM eform_templates")).rows.forEach((r: any) => tplMap.set(r.title, r.id));
    const legacyTpl = new Map<string, string>();
    INITIAL_EFORM_TEMPLATES.forEach((t) => { const uuid = tplMap.get(t.title); if (uuid) legacyTpl.set(t.id, uuid); });
    for (const s of INITIAL_EFORM_SUBMISSIONS)
      await pool.query(
        "INSERT INTO eform_submissions (template_id, template_title, pet_name, customer_name, date, status, field_values, signature_data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [legacyTpl.get(s.templateId) || null, s.templateTitle, s.petName, s.customerName, s.date, s.status, JSON.stringify(s.fieldValues), s.signatureData || null]
      );
    console.log(`[Seed] eform_submissions: ${INITIAL_EFORM_SUBMISSIONS.length} submission.`);
  }

  // Pet/customer-dependent clinical data
  const petMap = await legacyIdMap("pets");
  const custMap = await legacyIdMap("customers");
  const visitMap = await legacyIdMap("clinic_visits");

  if (await isEmpty("vac_schedules")) {
    for (const v of INITIAL_VAC_SCHEDULES)
      await pool.query(
        "INSERT INTO vac_schedules (pet_id, pet_name, customer_name, customer_phone, vaccine_name, due_date, status) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [petMap.get(v.petId) || null, v.petName, v.customerName, v.customerPhone, v.vaccineName, v.dueDate, v.status]
      );
    console.log(`[Seed] vac_schedules: ${INITIAL_VAC_SCHEDULES.length} jadwal.`);
  }

  if (await isEmpty("vac_histories")) {
    for (const v of INITIAL_VAC_HISTORIES)
      await pool.query(
        "INSERT INTO vac_histories (pet_id, pet_name, customer_name, vaccine_name, given_date, next_due_date, doctor_name, batch_number, expiry_date, certificate_no) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [petMap.get(v.petId) || null, v.petName, v.customerName, v.vaccineName, v.givenDate, v.nextDueDate, v.doctorName, v.batchNumber, v.expiryDate || null, v.certificateNo]
      );
    console.log(`[Seed] vac_histories: ${INITIAL_VAC_HISTORIES.length} riwayat.`);
  }

  if (await isEmpty("surgical_procedures")) {
    for (const s of INITIAL_SURGICAL_PROCEDURES)
      await pool.query(
        "INSERT INTO surgical_procedures (procedure_no, pet_id, pet_name, customer_name, procedure_name, category, date, start_time, end_time, lead_surgeon, assistant_surgeon, anesthetist, anesthesia_protocol, asa_score, status, findings, post_op_notes, suture_removal_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)",
        [s.procedureNo, petMap.get(s.petId) || null, s.petName, s.customerName, s.procedureName, s.category, s.date, s.startTime || null, s.endTime || null, s.leadSurgeon, s.assistantSurgeon || null, s.anesthetist, s.anesthesiaProtocol, s.asaScore || null, s.status, s.findings || null, s.postOpNotes || null, s.sutureRemovalDate || null]
      );
    console.log(`[Seed] surgical_procedures: ${INITIAL_SURGICAL_PROCEDURES.length} prosedur.`);
  }

  if (await isEmpty("soap_notes")) {
    for (const s of INITIAL_SOAP_NOTES)
      await pool.query(
        `INSERT INTO soap_notes (visit_id, pet_id, doctor_id, doctor_name, date, chief_complaint, history_of_present_illness, systolic_bp, diastolic_bp, heart_rate, respiratory_rate, temperature_c, sp_o2, weight_kg, height_cm, physical_exam_notes, working_diagnosis, differential_diagnosis, severity_score, triage_urgency, triage_rationale, medication_plan, prescribed_drugs, investigation_instructions, patient_education, is_finalized)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
        [visitMap.get(s.visitId) || null, petMap.get(s.petId) || null, s.doctorId || "", s.doctorName, s.date, s.chiefComplaint, s.historyOfPresentIllness, s.systolicBP || null, s.diastolicBP || null, s.heartRate || null, s.respiratoryRate || null, s.temperatureC || null, s.spO2 || null, s.weightKg || null, s.heightCm || null, s.physicalExamNotes, s.workingDiagnosis, s.differentialDiagnosis, s.severityScore || null, s.triageUrgency || null, s.triageRationale || null, s.medicationPlan, JSON.stringify(s.prescribedDrugs || []), s.investigationInstructions, s.patientEducation, s.isFinalized ?? false]
      );
    console.log(`[Seed] soap_notes: ${INITIAL_SOAP_NOTES.length} catatan SOAP.`);
  }

  if (await isEmpty("lab_tests")) {
    for (const l of INITIAL_LAB_TESTS)
      await pool.query(
        "INSERT INTO lab_tests (test_no, pet_id, pet_name, customer_name, test_name, status, ordered_by, ordered_at, completed_at, results, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
        [l.testNo, petMap.get(l.petId) || null, l.petName, l.customerName, l.testName, l.status, l.orderedBy, l.orderedAt, l.completedAt || null, l.results ? JSON.stringify(l.results) : null, l.notes || null]
      );
    console.log(`[Seed] lab_tests: ${INITIAL_LAB_TESTS.length} tes lab.`);
  }

  if (await isEmpty("loyalty_entries")) {
    for (const e of INITIAL_LOYALTY_ENTRIES)
      await pool.query(
        "INSERT INTO loyalty_entries (customer_id, customer_name, points_changed, type, description, date) VALUES ($1,$2,$3,$4,$5,$6)",
        [custMap.get(e.customerId) || null, e.customerName, e.pointsChanged, e.type, e.description, e.date]
      );
    console.log(`[Seed] loyalty_entries: ${INITIAL_LOYALTY_ENTRIES.length} entri.`);
  }

  if (await isEmpty("care_plans")) {
    for (const c of INITIAL_CARE_PLANS)
      await pool.query(
        "INSERT INTO care_plans (plan_no, pet_id, pet_name, customer_name, doctor_name, title, diagnosis, start_date, end_date, status, tasks, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
        [c.planNo, petMap.get(c.petId) || null, c.petName, c.customerName, c.doctorName, c.title, c.diagnosis, c.startDate, c.endDate, c.status, JSON.stringify(c.tasks), c.notes || null]
      );
    console.log(`[Seed] care_plans: ${INITIAL_CARE_PLANS.length} care plan.`);
  }

  if (await isEmpty("system_groups")) {
    for (const g of INITIAL_SYSTEM_GROUPS) {
      await pool.query(
        `INSERT INTO system_groups (code, name, type, description, department_head, allowed_roles, module_permissions, member_count, color, is_system_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [g.code, g.name, g.type, g.description, g.departmentHead,
         JSON.stringify(g.allowedRoles), JSON.stringify(g.modulePermissions),
         g.memberCount, g.color, g.isSystemDefault ?? false]
      );
    }
    console.log(`[Seed] system_groups: ${INITIAL_SYSTEM_GROUPS.length} grup.`);
  }

  if (await isEmpty("customer_tier_groups")) {
    for (const t of INITIAL_CUSTOMER_TIER_GROUPS) {
      await pool.query(
        `INSERT INTO customer_tier_groups (tier_name, code, min_spend, discount_percent, perks, color, member_count, auto_upgrade)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [t.tierName, t.code, t.minSpend, t.discountPercent, t.perks, t.color, t.memberCount, t.autoUpgrade]
      );
    }
    console.log(`[Seed] customer_tier_groups: ${INITIAL_CUSTOMER_TIER_GROUPS.length} tier.`);
  }

  if (await isEmpty("ambulance_units")) {
    const auStatusMap: Record<string, string> = { Tersedia: "available", Bertugas: "assigned", Maintenance: "maintenance" };
    for (const u of INITIAL_AMBULANCE_UNITS) {
      await pool.query(
        "INSERT INTO ambulance_units (code, status, vehicle_name, plate_no, current_driver, current_paramedic, equipment_status) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [u.code, auStatusMap[u.status] ?? "available", u.vehicleName, u.plateNo, u.currentDriver, u.currentParamedic, u.equipmentStatus]
      );
    }
    console.log(`[Seed] ambulance_units: ${INITIAL_AMBULANCE_UNITS.length} armada.`);

    if (INITIAL_AMBULANCE_REQUESTS.length > 0) {
      const { rows: unitRows } = await pool.query("SELECT id, code FROM ambulance_units");
      const unitByCode = new Map(unitRows.map((r: any) => [r.code, r.id]));
      for (const ar of INITIAL_AMBULANCE_REQUESTS) {
        const arStatusMap: Record<string, string> = { Menunggu: "received", "Menuju Lokasi": "en_route", Penjemputan: "arrived", Perjalanan: "patient_onboard", Completed: "closed", Cancelled: "cancelled" };
        const backendStatus = arStatusMap[ar.status] ?? "received";
        const assignedUnitId = ar.assignedUnitCode ? unitByCode.get(ar.assignedUnitCode) || null : null;
        const { rows: reqRows } = await pool.query(
          "INSERT INTO ambulance_requests (request_no, patient_name, caller_name, caller_phone, urgency, pickup_address, status, assigned_unit_id, notes, customer_name, customer_phone, pet_name, pet_species, destination) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id",
          [ar.requestNo, ar.petName, ar.customerName, ar.customerPhone, ar.urgency.toLowerCase(), ar.pickupAddress, backendStatus, assignedUnitId, ar.notes || null, ar.customerName, ar.customerPhone, ar.petName, ar.petSpecies || "", ar.destination || ""]
        );
        await pool.query(
          "INSERT INTO ambulance_events (request_id, actor, type) VALUES ($1,'system','received')",
          [reqRows[0].id]
        );
      }
      console.log(`[Seed] ambulance_requests: ${INITIAL_AMBULANCE_REQUESTS.length} permintaan.`);
    }
  }

  if (await isEmpty("patient_photos")) {
    for (const ph of INITIAL_PATIENT_PHOTOS)
      await pool.query(
        "INSERT INTO patient_photos (pet_id, pet_name, category, photo_url, caption, taken_by) VALUES ($1,$2,$3,$4,$5,$6)",
        [petMap.get(ph.petId) || null, ph.petName, ph.category, ph.photoUrl, ph.caption, ph.takenBy]
      );
    console.log(`[Seed] patient_photos: ${INITIAL_PATIENT_PHOTOS.length} foto.`);
  }
}
