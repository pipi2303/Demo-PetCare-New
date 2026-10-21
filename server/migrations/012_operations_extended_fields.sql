-- Extend operations tables with frontend metadata fields missing from the
-- initial state-machine-only schema.

ALTER TABLE ambulance_units
  ADD COLUMN IF NOT EXISTS vehicle_name       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS plate_no           TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_driver     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_paramedic  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS equipment_status   TEXT NOT NULL DEFAULT '';

ALTER TABLE ambulance_requests
  ADD COLUMN IF NOT EXISTS customer_name    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_phone   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pet_name         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pet_species      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS destination      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_unit_code TEXT NOT NULL DEFAULT '';

ALTER TABLE telehealth_sessions
  ADD COLUMN IF NOT EXISTS customer_name  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pet_id         UUID REFERENCES pets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pet_name       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS doctor_name    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS date           DATE,
  ADD COLUMN IF NOT EXISTS time_slot      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS type           TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS complaint      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fee            NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meeting_url    TEXT,
  ADD COLUMN IF NOT EXISTS notes          TEXT,
  ADD COLUMN IF NOT EXISTS diagnosis      TEXT,
  ADD COLUMN IF NOT EXISTS prescription   TEXT;
