CREATE TABLE IF NOT EXISTS backup_records (
  id text PRIMARY KEY,
  filename text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  trigger_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  sha256 text NOT NULL,
  status text NOT NULL DEFAULT 'COMPLETED',
  tables_summary jsonb,
  file_path text
);
CREATE INDEX IF NOT EXISTS idx_backup_records_triggered ON backup_records (triggered_at DESC);
