-- Indexes missing from initial schema — covers auth lookups and CRM search patterns.
CREATE INDEX IF NOT EXISTS idx_users_email                   ON users (email);
CREATE INDEX IF NOT EXISTS idx_customers_email               ON customers (email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone               ON customers (phone) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_customer  ON telehealth_sessions (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_date        ON invoices (customer_id, date DESC);
