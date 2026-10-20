-- Missing indexes on foreign keys and commonly-filtered columns.
-- Prevents full-table scans on joins and status-filtered queries at scale.

CREATE INDEX IF NOT EXISTS idx_branches_tenant_id         ON branches (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id            ON users (branch_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_unit_id ON ambulance_requests (assigned_unit_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_status  ON ambulance_requests (status);
CREATE INDEX IF NOT EXISTS idx_ambulance_events_request   ON ambulance_events (request_id);
CREATE INDEX IF NOT EXISTS idx_telehealth_events_session  ON telehealth_events (session_id);
CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_status ON telehealth_sessions (status);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id        ON customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pets_tenant_id             ON pets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_status       ON clinic_visits (status);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_branch_id    ON clinic_visits (branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status            ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_date              ON invoices (date DESC);
