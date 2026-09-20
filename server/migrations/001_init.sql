-- Fase 1 migrasi PetCare-New ke Postgres: infra auth/operations (yang sudah
-- server-side, sebelumnya file JSON) + modul inti ERP yang paling sering
-- dipakai (tenants/branches, customers, pets, catalog services, clinic
-- visits, invoices, cash transactions). Modul lain (grooming, hotel,
-- inventory, HR, dst) masih di localStorage dan menyusul di migrasi
-- berikutnya dengan pola yang sama.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  plan text NOT NULL,
  status text NOT NULL,
  owner_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  created_at date NOT NULL DEFAULT current_date,
  expires_at date
);

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_main_branch boolean NOT NULL DEFAULT false
);

-- Satu baris per tenant; disimpan sebagai jsonb karena AppSettings adalah
-- satu objek konfigurasi datar yang selalu diupdate lewat merge parsial
-- (updateAppSettings di DataContext.tsx melakukan {...prev, ...patch}).
CREATE TABLE app_settings (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  settings jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Konsolidasi profil INITIAL_USERS (mockData.ts) + password/pin hash yang
-- sebelumnya di server/data/users.json & pins.json.
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL,
  ownership_type text,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  branch_name text,
  active boolean NOT NULL DEFAULT true,
  password_hash text,
  pin_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ambulance_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'available',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ambulance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no text NOT NULL UNIQUE,
  patient_name text NOT NULL,
  caller_name text NOT NULL,
  caller_phone text NOT NULL,
  urgency text NOT NULL,
  pickup_address text NOT NULL,
  latitude double precision,
  longitude double precision,
  notes text,
  status text NOT NULL DEFAULT 'received',
  assigned_unit_id uuid REFERENCES ambulance_units(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ambulance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES ambulance_requests(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  type text NOT NULL,
  note text
);

CREATE TABLE telehealth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_no text NOT NULL UNIQUE,
  patient_name text NOT NULL,
  customer_id text NOT NULL,
  doctor_id text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  consent_accepted_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE telehealth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  type text NOT NULL,
  note text
);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  nik text,
  gender text,
  membership_tier text NOT NULL DEFAULT 'Silver',
  loyalty_points integer NOT NULL DEFAULT 0,
  total_spent bigint NOT NULL DEFAULT 0,
  pet_count integer NOT NULL DEFAULT 0,
  created_at date NOT NULL DEFAULT current_date
);

CREATE TABLE pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  species text NOT NULL,
  breed text,
  color text,
  gender text,
  sterilized boolean NOT NULL DEFAULT false,
  birth_date date,
  weight_kg numeric(6,2),
  microchip_no text,
  allergies text,
  notes text,
  photo_url text,
  created_at date NOT NULL DEFAULT current_date
);
CREATE INDEX idx_pets_customer_id ON pets (customer_id);

CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  estimated_duration_mins integer NOT NULL DEFAULT 0,
  price bigint NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE clinic_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  visit_no text NOT NULL UNIQUE,
  queue_no integer NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  doctor_id text,
  doctor_name text,
  complaint text NOT NULL,
  status text NOT NULL DEFAULT 'Menunggu',
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  queued_at text,
  called_at text,
  examined_at text,
  completed_at text,
  sla_minutes integer
);
CREATE INDEX idx_clinic_visits_customer ON clinic_visits (customer_id);
CREATE INDEX idx_clinic_visits_pet ON clinic_visits (pet_id);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  invoice_no text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  pet_name text,
  date date NOT NULL DEFAULT current_date,
  subtotal bigint NOT NULL DEFAULT 0,
  discount_amount bigint NOT NULL DEFAULT 0,
  total_amount bigint NOT NULL DEFAULT 0,
  paid_amount bigint NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Tunai',
  status text NOT NULL DEFAULT 'Belum Dibayar',
  loyalty_points_earned integer NOT NULL DEFAULT 0,
  cashier_name text NOT NULL
);
CREATE INDEX idx_invoices_customer ON invoices (customer_id);

CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  category text NOT NULL,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price bigint NOT NULL DEFAULT 0,
  total_price bigint NOT NULL DEFAULT 0
);
CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);

CREATE TABLE cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  trans_no text NOT NULL UNIQUE,
  type text NOT NULL,
  category text NOT NULL,
  amount bigint NOT NULL,
  occurred_at text NOT NULL,
  description text NOT NULL,
  reference_no text,
  operator text NOT NULL
);
