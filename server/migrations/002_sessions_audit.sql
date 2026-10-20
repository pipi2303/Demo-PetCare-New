-- Critical security fixes:
-- 1. Persistent session store (replaces in-memory Map in sessionService.ts)
-- 2. Persistent password reset tokens (replaces in-memory Map in authService.ts)
-- 3. Server-side audit log table (replaces localStorage-only audit trail)

CREATE TABLE IF NOT EXISTS sessions (
  token      text PRIMARY KEY,
  email      text NOT NULL,
  role       text NOT NULL,
  ownership_type text,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions (email);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token      text PRIMARY KEY,
  email      text NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_at   timestamptz NOT NULL DEFAULT now(),
  user_name   text NOT NULL,
  user_role   text NOT NULL,
  action      text NOT NULL,
  module      text NOT NULL DEFAULT 'Sistem',
  target      text NOT NULL DEFAULT '',
  details     text NOT NULL DEFAULT '',
  severity    text NOT NULL DEFAULT 'Info',
  branch_name text
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_logged_at ON audit_logs (logged_at DESC);
