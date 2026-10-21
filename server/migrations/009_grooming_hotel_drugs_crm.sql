-- Phase 3: Grooming, Hotel, Drugs, CRM minor tables.

CREATE TABLE IF NOT EXISTS drugs (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  category    TEXT    NOT NULL DEFAULT '',
  unit        TEXT    NOT NULL DEFAULT '',
  stock       INTEGER NOT NULL DEFAULT 0,
  min_stock   INTEGER NOT NULL DEFAULT 0,
  unit_price  NUMERIC(15,2) NOT NULL DEFAULT 0,
  batch_number TEXT   NOT NULL DEFAULT '',
  expiry_date DATE,
  location    TEXT    NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grooming_packages (
  id                       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT    NOT NULL,
  package_type             TEXT    NOT NULL,
  price_small              NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_medium             NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_large              NUMERIC(15,2) NOT NULL DEFAULT 0,
  estimated_duration_mins  INTEGER NOT NULL DEFAULT 60,
  description              TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grooming_bookings (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_no    TEXT    NOT NULL UNIQUE,
  customer_name TEXT    NOT NULL,
  pet_name      TEXT    NOT NULL,
  groomer_name  TEXT    NOT NULL DEFAULT '',
  package_type  TEXT    NOT NULL,
  date          DATE    NOT NULL,
  time_slot     TEXT    NOT NULL DEFAULT '',
  price         NUMERIC(15,2) NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'Menunggu'
                  CHECK (status IN ('Terkonfirmasi','Menunggu','Selesai','Batal')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grooming_sessions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_no      TEXT    NOT NULL UNIQUE,
  pet_id          UUID    REFERENCES pets(id) ON DELETE SET NULL,
  pet_name        TEXT    NOT NULL,
  customer_name   TEXT    NOT NULL,
  groomer_name    TEXT    NOT NULL DEFAULT '',
  package_type    TEXT    NOT NULL,
  pet_size        TEXT    NOT NULL DEFAULT 'Medium'
                    CHECK (pet_size IN ('Small','Medium','Large')),
  stage           TEXT    NOT NULL DEFAULT 'Booking',
  date            DATE    NOT NULL,
  time_slot       TEXT    NOT NULL DEFAULT '',
  price           NUMERIC(15,2) NOT NULL DEFAULT 0,
  before_photo_url TEXT,
  after_photo_url  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  room_no     TEXT    NOT NULL UNIQUE,
  room_type   TEXT    NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 1,
  daily_rate  NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_reservations (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_no   TEXT    NOT NULL UNIQUE,
  pet_id           UUID    REFERENCES pets(id) ON DELETE SET NULL,
  pet_name         TEXT    NOT NULL,
  customer_name    TEXT    NOT NULL,
  room_type        TEXT    NOT NULL,
  room_no          TEXT    NOT NULL,
  check_in_date    DATE    NOT NULL,
  check_out_date   DATE    NOT NULL,
  total_nights     INTEGER NOT NULL DEFAULT 1,
  daily_rate       NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cost       NUMERIC(15,2) NOT NULL DEFAULT 0,
  status           TEXT    NOT NULL DEFAULT 'Reservasi'
                     CHECK (status IN ('Reservasi','Aktif','Checkout Hari Ini','Selesai')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_no     TEXT    NOT NULL UNIQUE,
  customer_name  TEXT    NOT NULL,
  pet_name       TEXT    NOT NULL,
  room_no        TEXT    NOT NULL,
  check_in_date  DATE    NOT NULL,
  check_out_date DATE    NOT NULL,
  nights         INTEGER NOT NULL DEFAULT 1,
  total_cost     NUMERIC(15,2) NOT NULL DEFAULT 0,
  status         TEXT    NOT NULL DEFAULT 'Reservasi'
                   CHECK (status IN ('Reservasi','Aktif','Checkout','Batal')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_monitorings (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id       UUID    REFERENCES hotel_reservations(id) ON DELETE SET NULL,
  pet_name             TEXT    NOT NULL,
  room_no              TEXT    NOT NULL,
  date                 DATE    NOT NULL DEFAULT CURRENT_DATE,
  morning_feeding      BOOLEAN NOT NULL DEFAULT FALSE,
  morning_medication   BOOLEAN NOT NULL DEFAULT FALSE,
  afternoon_playtime   BOOLEAN NOT NULL DEFAULT FALSE,
  evening_feeding      BOOLEAN NOT NULL DEFAULT FALSE,
  evening_rest         BOOLEAN NOT NULL DEFAULT FALSE,
  temperature_c        NUMERIC(4,1),
  notes                TEXT,
  staff_name           TEXT    NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name   TEXT    NOT NULL,
  customer_phone  TEXT    NOT NULL DEFAULT '',
  pet_name        TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  type            TEXT    NOT NULL
                    CHECK (type IN ('Vaksin','Kontrol Ulang','Grooming','Ulang Tahun')),
  due_date        DATE    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'Menunggu'
                    CHECK (status IN ('Menunggu','Terkirim','Dikonfirmasi','Dibatalkan','Selesai')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  note         TEXT NOT NULL,
  author_name  TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drugs_code                    ON drugs (code);
CREATE INDEX IF NOT EXISTS idx_drugs_category                ON drugs (category);
CREATE INDEX IF NOT EXISTS idx_grooming_bookings_date        ON grooming_bookings (date DESC);
CREATE INDEX IF NOT EXISTS idx_grooming_sessions_date        ON grooming_sessions (date DESC);
CREATE INDEX IF NOT EXISTS idx_grooming_sessions_pet_id      ON grooming_sessions (pet_id);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_status     ON hotel_reservations (status);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_pet_id     ON hotel_reservations (pet_id);
CREATE INDEX IF NOT EXISTS idx_daily_monitorings_reservation ON daily_monitorings (reservation_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date            ON reminders (due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_status              ON reminders (status);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id    ON customer_notes (customer_id);
