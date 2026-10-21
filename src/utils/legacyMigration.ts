/**
 * One-time migration: reads legacy localStorage data and POSTs it to
 * the new Postgres-backed API endpoints. Runs automatically once on first
 * login after a server upgrade. Marks completion so it never runs twice.
 */

import { api } from "../services/api";

const MIGRATION_DONE_KEY = "petcare_migration_v2_done";

// Map of localStorage key → { endpoint, transform }
const MIGRATION_MAP: Record<string, { endpoint: string; transform?: (item: any) => any }> = {
  petcare_customers: { endpoint: "/customers" },
  petcare_pets: { endpoint: "/pets" },
  petcare_employees: { endpoint: "/employees" },
  petcare_drugs: { endpoint: "/drugs" },
  petcare_stock_items: { endpoint: "/stock-items" },
  petcare_suppliers: { endpoint: "/suppliers" },
  petcare_grooming_packages: { endpoint: "/grooming-packages" },
  petcare_hotel_rooms: { endpoint: "/hotel-rooms" },
  petcare_vac_schedules: { endpoint: "/vac-schedules" },
  petcare_reminders: { endpoint: "/reminders" },
  petcare_care_plans: { endpoint: "/care-plans" },
  petcare_eform_templates: { endpoint: "/eform-templates" },
  petcare_system_groups: { endpoint: "/system-groups" },
  petcare_customer_tier_groups: { endpoint: "/customer-tier-groups" },
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
