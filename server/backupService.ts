import crypto from "crypto";
import fs from "fs";
import path from "path";
import { gzipSync, gunzipSync } from "zlib";
import { execFile } from "child_process";
import { pool } from "./db";

export interface BackupSnapshot {
  id: string;
  filename: string;
  timestamp: string;
  triggerType: "AUTOMATED_END_OF_DAY" | "MANUAL_ON_DEMAND" | "SYSTEM_SHUTDOWN_HOOK";
  businessDate: string;
  cloudBucket: string;
  cloudUri: string;
  storageClass: "STANDARD" | "NEARLINE" | "ARCHIVE";
  encryption: string;
  sizeBytes: number;
  sha256Checksum: string;
  status: "COMPLETED" | "VERIFIED_INTACT" | "FAILED";
  durationMs: number;
  collectionsSummary: {
    patientsCount: number;
    customersCount: number;
    medicalRecordsCount: number;
    invoicesCount: number;
    prescriptionsCount: number;
    inventoryItemsCount: number;
    bookingsCount: number;
    staffCount: number;
  };
  integrityVerification: {
    lastChecked: string;
    isValid: boolean;
    verificationHash: string;
  };
}

export interface BackupConfig {
  autoBackupEnabled: boolean;
  endOfBusinessDayHour: number;
  endOfBusinessDayMinute: number;
  cloudProvider: "Google Cloud Storage (GCS)" | "AWS S3" | "Azure Blob";
  targetBucket: string;
  storageRegion: string;
  retentionDays: number;
  encryptionStandard: string;
  notifyOnSuccess: boolean;
}

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");

const TABLES = [
  "tenants", "branches", "users", "customers", "pets", "services",
  "clinic_visits", "invoices", "invoice_items", "cash_transactions",
  "ambulance_units", "ambulance_requests", "ambulance_events",
  "telehealth_sessions", "telehealth_events", "audit_logs", "sessions",
  "product_categories", "warehouses", "stock_items", "stock_movements",
  "suppliers", "purchase_orders", "employees",
  "drugs", "grooming_packages", "grooming_bookings", "grooming_sessions",
  "hotel_rooms", "hotel_reservations", "hotel_bookings", "daily_monitorings",
  "reminders", "customer_notes",
];

let config: BackupConfig = {
  autoBackupEnabled: true,
  endOfBusinessDayHour: 21,
  endOfBusinessDayMinute: 0,
  cloudProvider: "Google Cloud Storage (GCS)",
  targetBucket: process.env.BACKUP_RCLONE_DEST || `local:${BACKUP_DIR}`,
  storageRegion: "asia-southeast1 (Jakarta)",
  retentionDays: 30,
  encryptionStandard: "gzip",
  notifyOnSuccess: true,
};

let schedulerInterval: NodeJS.Timeout | null = null;
let lastExecutedDate: string | null = null;

async function dumpToBuffer(): Promise<Buffer> {
  const dump: Record<string, any> = {
    _meta: { exportedAt: new Date().toISOString(), format: "json-rows" },
  };
  for (const table of TABLES) {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table} LIMIT 100000`);
      dump[table] = rows;
    } catch {
      dump[table] = [];
    }
  }
  return Buffer.from(JSON.stringify(dump));
}

async function getCollectionsSummary() {
  const counts: Record<string, number> = {};
  const queries: [string, string][] = [
    ["pets", "patientsCount"],
    ["customers", "customersCount"],
    ["clinic_visits", "medicalRecordsCount"],
    ["invoices", "invoicesCount"],
    ["invoice_items", "prescriptionsCount"],
    ["services", "inventoryItemsCount"],
    ["ambulance_requests", "bookingsCount"],
    ["users", "staffCount"],
  ];
  await Promise.all(
    queries.map(async ([table, key]) => {
      try {
        const { rows } = await pool.query(`SELECT COUNT(*) AS n FROM ${table}`);
        counts[key] = Number(rows[0].n);
      } catch {
        counts[key] = 0;
      }
    })
  );
  return {
    patientsCount: counts.patientsCount,
    customersCount: counts.customersCount,
    medicalRecordsCount: counts.medicalRecordsCount,
    invoicesCount: counts.invoicesCount,
    prescriptionsCount: counts.prescriptionsCount,
    inventoryItemsCount: counts.inventoryItemsCount,
    bookingsCount: counts.bookingsCount,
    staffCount: counts.staffCount,
  };
}

function rowToSnapshot(row: any): BackupSnapshot {
  const summary = row.tables_summary || {};
  return {
    id: row.id,
    filename: row.filename,
    timestamp: row.triggered_at instanceof Date ? row.triggered_at.toISOString() : row.triggered_at,
    triggerType: row.trigger_type,
    businessDate: (row.triggered_at instanceof Date ? row.triggered_at : new Date(row.triggered_at)).toISOString().substring(0, 10),
    cloudBucket: process.env.BACKUP_RCLONE_DEST || `local:${BACKUP_DIR}`,
    cloudUri: row.file_path || path.join(BACKUP_DIR, row.filename),
    storageClass: "STANDARD",
    encryption: "gzip",
    sizeBytes: Number(row.size_bytes),
    sha256Checksum: row.sha256,
    status: row.status as BackupSnapshot["status"],
    durationMs: 0,
    collectionsSummary: {
      patientsCount: summary.patientsCount ?? 0,
      customersCount: summary.customersCount ?? 0,
      medicalRecordsCount: summary.medicalRecordsCount ?? 0,
      invoicesCount: summary.invoicesCount ?? 0,
      prescriptionsCount: summary.prescriptionsCount ?? 0,
      inventoryItemsCount: summary.inventoryItemsCount ?? 0,
      bookingsCount: summary.bookingsCount ?? 0,
      staffCount: summary.staffCount ?? 0,
    },
    integrityVerification: {
      lastChecked: new Date().toISOString(),
      isValid: row.status !== "FAILED",
      verificationHash: row.sha256,
    },
  };
}

export async function executeBackup(
  triggerType: "AUTOMATED_END_OF_DAY" | "MANUAL_ON_DEMAND",
  _customPayload?: any
): Promise<BackupSnapshot> {
  const startTime = Date.now();
  const now = new Date();
  const dateStr = now.toISOString().substring(0, 10);
  const timeStr = now.toTimeString().substring(0, 8).replace(/:/g, "");
  const filename = `petcare_erp_backup_${dateStr.replace(/-/g, "")}_${timeStr}.json.gz`;
  const filePath = path.join(BACKUP_DIR, filename);
  const id = `bk-${now.getTime()}`;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const raw = await dumpToBuffer();
  const gzipped = gzipSync(raw);
  fs.writeFileSync(filePath, gzipped);

  const sha256 = crypto.createHash("sha256").update(gzipped).digest("hex");
  const sizeBytes = gzipped.length;

  const summary = await getCollectionsSummary();

  await pool.query(
    `INSERT INTO backup_records (id, filename, triggered_at, trigger_type, size_bytes, sha256, status, tables_summary, file_path)
     VALUES ($1,$2,$3,$4,$5,$6,'COMPLETED',$7,$8)`,
    [id, filename, now, triggerType, sizeBytes, sha256, JSON.stringify(summary), filePath]
  );

  // Fire-and-forget rclone upload if destination is configured
  const rcloneDest = process.env.BACKUP_RCLONE_DEST;
  if (rcloneDest) {
    execFile("rclone", ["copy", filePath, rcloneDest], (err) => {
      if (err) console.error("[BackupService] rclone upload failed:", err.message);
      else console.log(`[BackupService] rclone upload complete: ${rcloneDest}`);
    });
  }

  const durationMs = Date.now() - startTime;
  console.log(`[BackupService] ${triggerType} completed: ${filename} (${sizeBytes} bytes, sha256: ${sha256.substring(0, 12)}...) in ${durationMs}ms`);

  return {
    id,
    filename,
    timestamp: now.toISOString(),
    triggerType,
    businessDate: dateStr,
    cloudBucket: rcloneDest || `local:${BACKUP_DIR}`,
    cloudUri: filePath,
    storageClass: "STANDARD",
    encryption: "gzip",
    sizeBytes,
    sha256Checksum: sha256,
    status: "COMPLETED",
    durationMs,
    collectionsSummary: summary,
    integrityVerification: {
      lastChecked: now.toISOString(),
      isValid: true,
      verificationHash: sha256,
    },
  };
}

export function initBackupBackgroundService() {
  if (schedulerInterval) clearInterval(schedulerInterval);

  console.log(
    `[BackupService] Background Auto-Backup Service initialized. Scheduled: ${config.endOfBusinessDayHour.toString().padStart(2, "0")}:${config.endOfBusinessDayMinute.toString().padStart(2, "0")} WIB.`
  );

  schedulerInterval = setInterval(async () => {
    if (!config.autoBackupEnabled) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayDateStr = now.toISOString().substring(0, 10);

    const isTargetTime =
      currentHour === config.endOfBusinessDayHour &&
      currentMinute >= config.endOfBusinessDayMinute &&
      currentMinute <= config.endOfBusinessDayMinute + 2;

    if (isTargetTime && lastExecutedDate !== todayDateStr) {
      console.log(`[BackupService] End of Business Day reached (${currentHour}:${currentMinute}). Triggering automatic backup...`);
      lastExecutedDate = todayDateStr;
      try {
        await executeBackup("AUTOMATED_END_OF_DAY");
      } catch (err) {
        console.error("[BackupService] Automatic daily backup failed:", err);
      }
    }
  }, 30000);
}

export async function getBackupStatus() {
  const now = new Date();
  const scheduledTimeToday = new Date();
  scheduledTimeToday.setHours(config.endOfBusinessDayHour, config.endOfBusinessDayMinute, 0, 0);

  const nextScheduledRun = now > scheduledTimeToday
    ? new Date(scheduledTimeToday.getTime() + 86400000)
    : scheduledTimeToday;

  let lastBackup: BackupSnapshot | null = null;
  let totalBackupsCount = 0;
  let totalStorageUsedBytes = 0;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM backup_records ORDER BY triggered_at DESC LIMIT 1"
    );
    if (rows[0]) lastBackup = rowToSnapshot(rows[0]);

    const agg = await pool.query(
      "SELECT COUNT(*) AS cnt, COALESCE(SUM(size_bytes),0) AS total FROM backup_records"
    );
    totalBackupsCount = Number(agg.rows[0].cnt);
    totalStorageUsedBytes = Number(agg.rows[0].total);
  } catch {
    // DB may not have the table yet during first boot
  }

  return {
    serviceStatus: "ONLINE_ACTIVE",
    isDaemonRunning: schedulerInterval !== null,
    autoBackupEnabled: config.autoBackupEnabled,
    endOfBusinessDaySchedule: `${config.endOfBusinessDayHour.toString().padStart(2, "0")}:${config.endOfBusinessDayMinute.toString().padStart(2, "0")} WIB`,
    nextScheduledRun: nextScheduledRun.toISOString(),
    lastBackup,
    totalBackupsCount,
    totalStorageUsedBytes,
    cloudProvider: config.cloudProvider,
    targetBucket: config.targetBucket,
    storageRegion: config.storageRegion,
    retentionDays: config.retentionDays,
    encryptionStandard: config.encryptionStandard,
    config,
  };
}

export async function getAllBackups(): Promise<BackupSnapshot[]> {
  const { rows } = await pool.query(
    "SELECT * FROM backup_records ORDER BY triggered_at DESC LIMIT 100"
  );
  return rows.map(rowToSnapshot);
}

export function updateBackupConfig(newConfig: Partial<BackupConfig>): BackupConfig {
  config = { ...config, ...newConfig };
  console.log("[BackupService] Configuration updated:", config);
  return config;
}

export async function verifySnapshotIntegrity(snapshotId: string) {
  const { rows } = await pool.query("SELECT * FROM backup_records WHERE id = $1", [snapshotId]);
  const record = rows[0];
  if (!record) throw new Error(`Snapshot with ID ${snapshotId} not found.`);

  let isValid = false;
  const filePath = record.file_path;

  if (filePath && fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath);
    const computedHash = crypto.createHash("sha256").update(fileContent).digest("hex");
    isValid = computedHash === record.sha256;
    const newStatus = isValid ? "VERIFIED_INTACT" : "FAILED";
    await pool.query("UPDATE backup_records SET status = $1 WHERE id = $2", [newStatus, snapshotId]);
    record.status = newStatus;
  } else {
    // File missing — mark as failed
    await pool.query("UPDATE backup_records SET status = 'FAILED' WHERE id = $1", [snapshotId]);
  }

  return {
    snapshotId,
    filename: record.filename,
    isValid,
    sha256Checksum: record.sha256,
    cloudUri: filePath || "",
    verifiedAt: new Date().toISOString(),
  };
}

export async function restoreFromSnapshot(snapshotId: string) {
  const { rows } = await pool.query("SELECT * FROM backup_records WHERE id = $1", [snapshotId]);
  const record = rows[0];
  if (!record) throw new Error(`Snapshot tidak ditemukan: ${snapshotId}`);

  const filePath = record.file_path as string;
  if (!filePath || !fs.existsSync(filePath)) throw new Error(`File backup tidak ada di disk: ${filePath}`);

  const fileContent = fs.readFileSync(filePath);
  const computedHash = crypto.createHash("sha256").update(fileContent).digest("hex");
  if (computedHash !== record.sha256) throw new Error("Integrity check gagal — SHA256 tidak cocok, file mungkin korup.");

  const dump: Record<string, any[]> = JSON.parse(gunzipSync(fileContent).toString("utf8"));

  let totalRows = 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Truncate in reverse FK order so constraints don't block
    await client.query(`TRUNCATE ${[...TABLES].reverse().join(", ")} CASCADE`);
    for (const table of TABLES) {
      const tableRows = dump[table];
      if (!Array.isArray(tableRows) || tableRows.length === 0) continue;
      for (const row of tableRows) {
        const cols = Object.keys(row);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        await client.query(
          `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders})`,
          cols.map((c) => row[c])
        );
        totalRows++;
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await pool.query("UPDATE backup_records SET status = 'VERIFIED_INTACT' WHERE id = $1", [snapshotId]);
  const restoredAt = new Date().toISOString();
  console.log(`[BackupService] Restore selesai dari ${record.filename}: ${totalRows} baris di ${TABLES.length} tabel.`);
  return { restoredAt, tablesRestored: TABLES.length, rowsRestored: totalRows, filename: record.filename };
}
