// Entry point for `npm run db:migrate`. Kept separate from migrate.ts so that
// server.ts can import { runMigrations } without triggering a second run.
import { runMigrations } from "./migrate";

runMigrations()
  .then(() => {
    console.log("[Migrate] Semua migrasi sudah diterapkan.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[Migrate] Gagal:", err);
    process.exit(1);
  });
