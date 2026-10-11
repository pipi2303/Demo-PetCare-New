import "dotenv/config";
import fs from "fs";
import path from "path";
import { pool } from "./db";

const MIGRATIONS_DIR = path.join(process.cwd(), "server", "migrations");

export async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations")).rows.map((r) => r.filename)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    console.log(`[Migrate] Menjalankan ${file}...`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`[Migrate] ✅ ${file} selesai.`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migrasi ${file} gagal: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
}
