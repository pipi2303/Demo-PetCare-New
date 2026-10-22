/**
 * One-time migration: reads legacy localStorage data and POSTs it to
 * the new Postgres-backed API endpoints. Runs automatically once on first
 * login after a server upgrade. Marks completion so it never runs twice.
 */

import { api } from "../services/api";

const MIGRATION_DONE_KEY = "petcare_migration_v2_done";

// Map of localStorage key → { endpoint, transform }
const MIGRATION_MAP: Record<string, { endpoint: string; transform?: (item: any) => any }> = {
  // Phase 1 — core
  petcare_customers: { endpoint: "/customers" },
  petcare_pets: { endpoint: "/pets" },
  // Phase 2 — inventory & HR
  petcare_employees: { endpoint: "/employees" },
  petcare_drugs: { endpoint: "/drugs" },
  petcare_stock_items: { endpoint: "/stock-items" },
  petcare_suppliers: { endpoint: "/suppliers" },
  petcare_purchase_orders: { endpoint: "/purchase-orders" },
  petcare_product_categories: { endpoint: "/product-categories", transform: (item) => ({ name: item.name }) },
  petcare_warehouses: { endpoint: "/warehouses", transform: (item) => ({ name: item.name }) },
  // Phase 3 — grooming, hotel, pharmacy, CRM
  petcare_grooming_packages: { endpoint: "/grooming-packages" },
  petcare_grooming_bookings: { endpoint: "/grooming-bookings" },
  petcare_hotel_rooms: { endpoint: "/hotel-rooms" },
  petcare_hotel_reservations: { endpoint: "/hotel-reservations" },
  petcare_reminders: { endpoint: "/reminders" },
  petcare_customer_notes: { endpoint: "/customer-notes" },
  // Phase 4 — medical records, bookings
  petcare_doc_bookings: { endpoint: "/doc-bookings" },
  petcare_vac_schedules: { endpoint: "/vac-schedules" },
  petcare_vac_histories: { endpoint: "/vac-histories" },
  petcare_deworming_records: { endpoint: "/deworming-records" },
  petcare_soap_notes: { endpoint: "/soap-notes" },
  petcare_medical_records: { endpoint: "/medical-records" },
  petcare_inpatients: { endpoint: "/inpatients" },
  petcare_discharge_notes: { endpoint: "/discharge-notes" },
  petcare_lab_tests: { endpoint: "/lab-tests" },
  petcare_surgical_procedures: { endpoint: "/surgical-procedures" },
  petcare_pre_consult_forms: { endpoint: "/pre-consult-forms" },
  petcare_referral_letters: { endpoint: "/referral-letters" },
  petcare_visit_surveys: { endpoint: "/visit-surveys" },
  petcare_care_plans: { endpoint: "/care-plans" },
  petcare_absence_records: { endpoint: "/absence-records" },
  petcare_leave_requests: { endpoint: "/leave-requests" },
  // Phase 5 — config, e-forms, loyalty
  petcare_eform_templates: { endpoint: "/eform-templates" },
  petcare_eform_submissions: { endpoint: "/eform-submissions" },
  petcare_system_groups: { endpoint: "/system-groups" },
  petcare_customer_tier_groups: { endpoint: "/customer-tier-groups" },
  petcare_patient_photos: { endpoint: "/patient-photos" },
  petcare_loyalty_entries: { endpoint: "/loyalty-entries" },
  petcare_inter_branch_transfers: { endpoint: "/inter-branch-transfers" },
};

function readLocalStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasLegacyData(): boolean {
  return Object.keys(MIGRATION_MAP).some((key) => {
    const items = readLocalStorage(key);
    // Only consider it legacy data if it contains non-seed IDs (seed IDs match 'c_1', 'p_1' etc.)
    return items.length > 0 && items.some((item: any) => item?.id && !item.id.match(/^[a-z]+_[0-9]+$/));
  });
}

export async function runLegacyMigrationIfNeeded(): Promise<{ migrated: number; skipped: number } | null> {
  if (localStorage.getItem(MIGRATION_DONE_KEY)) return null;
  if (!hasLegacyData()) {
    localStorage.setItem(MIGRATION_DONE_KEY, "1");
    return null;
  }

  let migrated = 0;
  let skipped = 0;

  for (const [lsKey, { endpoint, transform }] of Object.entries(MIGRATION_MAP)) {
    const items = readLocalStorage<any>(lsKey);
    if (items.length === 0) continue;

    for (const item of items) {
      const payload = transform ? transform(item) : item;
      try {
        await api.post(endpoint, payload);
        migrated++;
      } catch {
        skipped++; // already exists or validation failed — skip
      }
    }
  }

  localStorage.setItem(MIGRATION_DONE_KEY, "1");
  console.log(`[LegacyMigration] Done: ${migrated} migrated, ${skipped} skipped.`);
  return { migrated, skipped };
}
