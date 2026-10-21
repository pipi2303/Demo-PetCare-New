-- Inventory & Employee tables (Phase 2 migration from localStorage).

CREATE TABLE IF NOT EXISTS product_categories (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS warehouses (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS stock_items (
  id                         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                        TEXT    NOT NULL UNIQUE,
  name                       TEXT    NOT NULL,
  category                   TEXT    NOT NULL DEFAULT '',
  warehouse                  TEXT    NOT NULL DEFAULT '',
  stock                      INTEGER NOT NULL DEFAULT 0,
  min_stock                  INTEGER NOT NULL DEFAULT 0,
  unit                       TEXT    NOT NULL DEFAULT 'pcs',
  purchase_price             NUMERIC(15,2) NOT NULL DEFAULT 0,
  selling_price              NUMERIC(15,2) NOT NULL DEFAULT 0,
  supplier_name              TEXT    NOT NULL DEFAULT '',
  expiry_date                DATE,
  batch_number               TEXT,
  is_clearance_sale          BOOLEAN NOT NULL DEFAULT FALSE,
  clearance_discount_percent INTEGER,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        UUID    REFERENCES stock_items(id) ON DELETE SET NULL,
  item_name      TEXT    NOT NULL,
  type           TEXT    NOT NULL CHECK (type IN ('Masuk','Keluar','Transfer','Opname')),
  quantity       INTEGER NOT NULL,
  from_warehouse TEXT,
  to_warehouse   TEXT,
  reference_no   TEXT    NOT NULL DEFAULT '',
  date           DATE    NOT NULL DEFAULT CURRENT_DATE,
  operator       TEXT    NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  contact_person TEXT NOT NULL DEFAULT '',
  phone          TEXT NOT NULL DEFAULT '',
  email          TEXT NOT NULL DEFAULT '',
  address        TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no         TEXT    NOT NULL UNIQUE,
  supplier_name TEXT    NOT NULL,
  date          DATE    NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT    NOT NULL DEFAULT 'Draft'
                  CHECK (status IN ('Draft','Dikirim','Diterima Sebagian','Diterima','Dibatalkan')),
  items         JSONB   NOT NULL DEFAULT '[]',
  total_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nik                     TEXT    NOT NULL UNIQUE,
  name                    TEXT    NOT NULL,
  role                    TEXT    NOT NULL,
  department              TEXT    NOT NULL DEFAULT '',
  branch_id               UUID    REFERENCES branches(id) ON DELETE SET NULL,
  shift                   TEXT,
  phone                   TEXT    NOT NULL DEFAULT '',
  email                   TEXT    NOT NULL DEFAULT '',
  hire_date               DATE    NOT NULL DEFAULT CURRENT_DATE,
  sip_number              TEXT,
  base_salary             NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_rate_percent NUMERIC(5,2)  NOT NULL DEFAULT 0,
  status                  TEXT    NOT NULL DEFAULT 'Aktif'
                            CHECK (status IN ('Aktif','Cuti','Resigned')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_items_sku          ON stock_items (sku);
CREATE INDEX IF NOT EXISTS idx_stock_items_category     ON stock_items (category);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id  ON stock_movements (item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date     ON stock_movements (date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status   ON purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_employees_status         ON employees (status);
