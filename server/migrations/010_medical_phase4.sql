-- Phase 4: Medical records, doctor bookings, care plans, HR sub-modules.

CREATE TABLE IF NOT EXISTS medical_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id       UUID REFERENCES pets(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  type         TEXT NOT NULL
                 CHECK (type IN ('Kunjungan','Vaksinasi','Lab','Rawat Inap','Grooming','Tindakan','Foto','Ambulance')),
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  performed_by TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS soap_notes (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id                   UUID UNIQUE REFERENCES clinic_visits(id) ON DELETE SET NULL,
  pet_id                     UUID REFERENCES pets(id) ON DELETE SET NULL,
  doctor_id                  TEXT NOT NULL DEFAULT '',
  doctor_name                TEXT NOT NULL DEFAULT '',
  date                       DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint            TEXT NOT NULL DEFAULT '',
  history_of_present_illness TEXT NOT NULL DEFAULT '',
  systolic_bp                NUMERIC(6,1),
  diastolic_bp               NUMERIC(6,1),
  heart_rate                 NUMERIC(6,1),
  respiratory_rate           NUMERIC(6,1),
  temperature_c              NUMERIC(5,2),
  sp_o2                      NUMERIC(5,1),
  weight_kg                  NUMERIC(6,2),
  height_cm                  NUMERIC(6,1),
  physical_exam_notes        TEXT NOT NULL DEFAULT '',
  working_diagnosis          TEXT NOT NULL DEFAULT '',
  differential_diagnosis     TEXT NOT NULL DEFAULT '',
  severity_score             TEXT,
  triage_urgency             TEXT,
  triage_rationale           TEXT,
  medication_plan            TEXT NOT NULL DEFAULT '',
  prescribed_drugs           JSONB NOT NULL DEFAULT '[]',
  investigation_instructions TEXT NOT NULL DEFAULT '',
  patient_education          TEXT NOT NULL DEFAULT '',
  is_finalized               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inpatients (
  inpatient_no   TEXT NOT NULL UNIQUE,
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id         UUID REFERENCES pets(id) ON DELETE SET NULL,
  pet_name       TEXT NOT NULL,
  customer_name  TEXT NOT NULL,
  cage_no        TEXT NOT NULL DEFAULT '',
  doctor_id      TEXT NOT NULL DEFAULT '',
  doctor_name    TEXT NOT NULL DEFAULT '',
  diagnosis      TEXT NOT NULL DEFAULT '',
  diet_instructions TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'Stabil'
                   CHECK (status IN ('Stabil','Membaik','Kritis','Pulang')),
  admitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  discharged_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discharge_notes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id              UUID REFERENCES clinic_visits(id) ON DELETE SET NULL,
  pet_id                UUID REFERENCES pets(id) ON DELETE SET NULL,
  pet_name              TEXT NOT NULL,
  customer_name         TEXT NOT NULL,
  final_diagnosis       TEXT NOT NULL DEFAULT '',
  home_medications      TEXT NOT NULL DEFAULT '',
  home_care_instructions TEXT NOT NULL DEFAULT '',
  restrictions          TEXT NOT NULL DEFAULT '',
  warning_signs         TEXT NOT NULL DEFAULT '',
  follow_up_date        DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_tests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_no       TEXT NOT NULL UNIQUE,
  pet_id        UUID REFERENCES pets(id) ON DELETE SET NULL,
  pet_name      TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  test_name     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Dalam Proses'
                  CHECK (status IN ('Menunggu','Dalam Proses','Selesai')),
  ordered_by    TEXT NOT NULL DEFAULT '',
  ordered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  results       JSONB,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS surgical_procedures (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_no      TEXT NOT NULL UNIQUE,
  pet_id            UUID REFERENCES pets(id) ON DELETE SET NULL,
  pet_name          TEXT NOT NULL,
  customer_name     TEXT NOT NULL,
  procedure_name    TEXT NOT NULL,
  category          TEXT NOT NULL,
  date              DATE NOT NULL,
  start_time        TEXT,
  end_time          TEXT,
  lead_surgeon      TEXT NOT NULL DEFAULT '',
  assistant_surgeon TEXT,
  anesthetist       TEXT NOT NULL DEFAULT '',
  anesthesia_protocol TEXT NOT NULL DEFAULT '',
  asa_score         TEXT,
  status            TEXT NOT NULL DEFAULT 'Selesai',
  findings          TEXT,
  post_op_notes     TEXT,
  suture_removal_date DATE,
  complications     TEXT,
  photo_url         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vac_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          UUID REFERENCES pets(id) ON DELETE CASCADE,
  pet_name        TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL DEFAULT '',
  vaccine_name    TEXT NOT NULL,
  due_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Mendatang'
                    CHECK (status IN ('Terlambat','Jatuh Tempo','Mendatang','Selesai')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vac_histories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id         UUID REFERENCES pets(id) ON DELETE CASCADE,
  pet_name       TEXT NOT NULL,
  customer_name  TEXT NOT NULL,
  vaccine_name   TEXT NOT NULL,
  given_date     DATE NOT NULL,
  next_due_date  DATE NOT NULL,
  doctor_name    TEXT NOT NULL DEFAULT '',
  batch_number   TEXT NOT NULL DEFAULT '',
  expiry_date    DATE,
  certificate_no TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deworming_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID REFERENCES pets(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage        TEXT NOT NULL DEFAULT '',
  given_by      TEXT NOT NULL DEFAULT '',
  next_due_date DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pre_consult_forms (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name       TEXT NOT NULL,
  pet_name            TEXT NOT NULL,
  chief_complaint     TEXT NOT NULL DEFAULT '',
  known_allergies     TEXT NOT NULL DEFAULT '',
  current_medications TEXT NOT NULL DEFAULT '',
  home_weight_kg      NUMERIC(6,2),
  behavior_notes      TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'Menunggu'
                        CHECK (status IN ('Menunggu','Digunakan')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_letters (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_no          TEXT NOT NULL UNIQUE,
  pet_name             TEXT NOT NULL,
  customer_name        TEXT NOT NULL,
  destination_clinic   TEXT NOT NULL DEFAULT '',
  destination_doctor   TEXT NOT NULL DEFAULT '',
  urgency              TEXT NOT NULL DEFAULT 'Rutin'
                         CHECK (urgency IN ('Rutin','Segera','Darurat')),
  reason               TEXT NOT NULL DEFAULT '',
  current_medications  TEXT NOT NULL DEFAULT '',
  notes                TEXT NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visit_surveys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      UUID REFERENCES clinic_visits(id) ON DELETE SET NULL,
  pet_name      TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  doctor_name   TEXT NOT NULL DEFAULT '',
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments      TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_bookings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_no                  TEXT NOT NULL UNIQUE,
  customer_id                 UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name               TEXT NOT NULL,
  pet_id                      UUID REFERENCES pets(id) ON DELETE SET NULL,
  pet_name                    TEXT NOT NULL,
  pet_species                 TEXT NOT NULL DEFAULT '',
  doctor_id                   TEXT NOT NULL DEFAULT '',
  doctor_name                 TEXT NOT NULL DEFAULT '',
  date                        DATE NOT NULL,
  time_slot                   TEXT NOT NULL DEFAULT '',
  status                      TEXT NOT NULL DEFAULT 'Menunggu'
                                CHECK (status IN ('Terkonfirmasi','Menunggu','Selesai','Batal')),
  complaint                   TEXT NOT NULL DEFAULT '',
  branch_id                   UUID REFERENCES branches(id) ON DELETE SET NULL,
  google_calendar_event_id    TEXT,
  google_calendar_sync_status TEXT,
  google_calendar_html_link   TEXT,
  last_synced_at              TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS care_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_no       TEXT NOT NULL UNIQUE,
  pet_id        UUID REFERENCES pets(id) ON DELETE SET NULL,
  pet_name      TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  doctor_name   TEXT NOT NULL DEFAULT '',
  title         TEXT NOT NULL,
  diagnosis     TEXT NOT NULL DEFAULT '',
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Aktif'
                  CHECK (status IN ('Aktif','Selesai','Ditangguhkan')),
  tasks         JSONB NOT NULL DEFAULT '[]',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS absence_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  date          DATE NOT NULL,
  check_in      TEXT NOT NULL DEFAULT '',
  check_out     TEXT,
  status        TEXT NOT NULL DEFAULT 'Hadir'
                  CHECK (status IN ('Hadir','Terlambat','Izin','Sakit','Selesai')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  leave_type    TEXT NOT NULL
                  CHECK (leave_type IN ('Tahunan','Sakit','Izin','Bersalin','Duka')),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  total_days    INTEGER NOT NULL DEFAULT 1,
  reason        TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'Menunggu'
                  CHECK (status IN ('Menunggu','Disetujui','Ditolak')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_soap_notes_pet_id       ON soap_notes (pet_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_visit_id     ON soap_notes (visit_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id  ON medical_records (pet_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date    ON medical_records (date DESC);
CREATE INDEX IF NOT EXISTS idx_inpatients_pet_id       ON inpatients (pet_id);
CREATE INDEX IF NOT EXISTS idx_inpatients_status       ON inpatients (status);
CREATE INDEX IF NOT EXISTS idx_lab_tests_pet_id        ON lab_tests (pet_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_status        ON lab_tests (status);
CREATE INDEX IF NOT EXISTS idx_vac_schedules_pet_id    ON vac_schedules (pet_id);
CREATE INDEX IF NOT EXISTS idx_vac_schedules_due_date  ON vac_schedules (due_date);
CREATE INDEX IF NOT EXISTS idx_vac_histories_pet_id    ON vac_histories (pet_id);
CREATE INDEX IF NOT EXISTS idx_doc_bookings_date       ON doc_bookings (date DESC);
CREATE INDEX IF NOT EXISTS idx_doc_bookings_customer   ON doc_bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_care_plans_pet_id       ON care_plans (pet_id);
CREATE INDEX IF NOT EXISTS idx_care_plans_status       ON care_plans (status);
CREATE INDEX IF NOT EXISTS idx_absence_records_emp     ON absence_records (employee_id);
CREATE INDEX IF NOT EXISTS idx_absence_records_date    ON absence_records (date DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp      ON leave_requests (employee_id);
