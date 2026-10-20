ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE services ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_customers_active ON customers (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pets_active ON pets (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_services_active ON services (id) WHERE deleted_at IS NULL;
