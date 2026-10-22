-- Phase 5: Inter-branch transfers, loyalty entries, e-forms, informed consents,
-- system groups, customer tiers, patient photos. Also extends audit_logs.

-- Extend audit_logs with missing frontend fields.
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS branch_id      UUID,
  ADD COLUMN IF NOT EXISTS previous_value TEXT,
  ADD COLUMN IF NOT EXISTS new_value      TEXT;

CREATE TABLE IF NOT EXISTS inter_branch_transfers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_no        TEXT NOT NULL UNIQUE,
  source_branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  source_branch_name TEXT NOT NULL,
  dest_branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  dest_branch_name   TEXT NOT NULL,
  stock_item_id      UUID REFERENCES stock_items(id) ON DELETE SET NULL,
  item_name          TEXT NOT NULL,
  qty                INTEGER NOT NULL,
  unit               TEXT NOT NULL DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'Dalam Pengiriman'
                       CHECK (status IN ('Dalam Pengiriman','Diterima')),
  date               DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_by       TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  points_changed INTEGER NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('Earn','Redeem')),
  description   TEXT NOT NULL DEFAULT '',
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eform_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  fields      JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eform_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID REFERENCES eform_templates(id) ON DELETE SET NULL,
  template_title  TEXT NOT NULL,
  pet_name        TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'Draft'
                    CHECK (status IN ('Draft','Ditandatangani','Disimpan ke EMR')),
  field_values    JSONB NOT NULL DEFAULT '{}',
  -- Use POST /api/uploads to get a URL; store the URL here rather than raw base64.
  signature_data  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS informed_consents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_no         TEXT NOT NULL UNIQUE,
  pet_id             UUID REFERENCES pets(id) ON DELETE SET NULL,
  pet_name           TEXT NOT NULL,
  customer_id        UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name      TEXT NOT NULL,
  customer_phone     TEXT,
  customer_nik       TEXT,
  doctor_id          TEXT NOT NULL DEFAULT '',
  doctor_name        TEXT NOT NULL DEFAULT '',
  procedure_type     TEXT NOT NULL,
  diagnosis          TEXT NOT NULL DEFAULT '',
  procedure_details  TEXT NOT NULL DEFAULT '',
  risks_disclosed    TEXT NOT NULL DEFAULT '',
  estimated_cost     NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- Use POST /api/uploads to get a URL; store the URL here rather than raw base64.
  signature_data_url TEXT NOT NULL DEFAULT '',
  signed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  witness_name       TEXT NOT NULL DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'Ditandatangani'
                       CHECK (status IN ('Ditandatangani','Dibatalkan')),
  security_hash      TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_groups (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  type               TEXT NOT NULL DEFAULT '',
  description        TEXT NOT NULL DEFAULT '',
  department_head    TEXT NOT NULL DEFAULT '',
  allowed_roles      JSONB NOT NULL DEFAULT '[]',
  module_permissions JSONB NOT NULL DEFAULT '[]',
  member_count       INTEGER NOT NULL DEFAULT 0,
  color              TEXT NOT NULL DEFAULT '#6366f1',
  branch_id          UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_system_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_tier_groups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name        TEXT NOT NULL,
  code             TEXT NOT NULL UNIQUE,
  min_spend        NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  perks            TEXT NOT NULL DEFAULT '',
  color            TEXT NOT NULL DEFAULT '#6366f1',
  member_count     INTEGER NOT NULL DEFAULT 0,
  auto_upgrade     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id     UUID REFERENCES pets(id) ON DELETE CASCADE,
  pet_name   TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'Lainnya',
  -- Use POST /api/uploads to get a served URL; store that URL here.
  photo_url  TEXT NOT NULL DEFAULT '',
  caption    TEXT NOT NULL DEFAULT '',
  taken_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  taken_by   TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inter_branch_transfers_status   ON inter_branch_transfers (status);
CREATE INDEX IF NOT EXISTS idx_loyalty_entries_customer        ON loyalty_entries (customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_entries_date            ON loyalty_entries (date DESC);
CREATE INDEX IF NOT EXISTS idx_eform_submissions_template      ON eform_submissions (template_id);
CREATE INDEX IF NOT EXISTS idx_informed_consents_customer      ON informed_consents (customer_id);
CREATE INDEX IF NOT EXISTS idx_informed_consents_pet           ON informed_consents (pet_id);
CREATE INDEX IF NOT EXISTS idx_system_groups_code              ON system_groups (code);
CREATE INDEX IF NOT EXISTS idx_patient_photos_pet              ON patient_photos (pet_id);
