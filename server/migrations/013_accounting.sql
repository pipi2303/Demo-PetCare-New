-- Accounting module: Chart of Accounts, double-entry journal, COGS tracking.

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL CHECK (type IN ('Aset','Kewajiban','Ekuitas','Pendapatan','HPP','Beban')),
  description TEXT    NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extend cash_transactions with GL account link
ALTER TABLE cash_transactions
  ADD COLUMN IF NOT EXISTS gl_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL;

-- Extend invoice_items with COGS tracking
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS stock_item_id  UUID REFERENCES stock_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cogs_amount    NUMERIC(15,2) NOT NULL DEFAULT 0;

-- Double-entry journal header
CREATE TABLE IF NOT EXISTS journal_entries (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no      TEXT    NOT NULL UNIQUE,
  date          DATE    NOT NULL DEFAULT CURRENT_DATE,
  description   TEXT    NOT NULL,
  reference_no  TEXT    NOT NULL DEFAULT '',
  source        TEXT    NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('invoice','cash_transaction','payroll','cogs','manual')),
  created_by    TEXT    NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Double-entry journal lines (debit/credit pairs)
CREATE TABLE IF NOT EXISTS journal_lines (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    UUID    NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id  UUID    NOT NULL REFERENCES chart_of_accounts(id),
  debit       NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit      NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT    NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date      ON journal_entries (date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source    ON journal_entries (source);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry       ON journal_lines (entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account     ON journal_lines (account_id);
CREATE INDEX IF NOT EXISTS idx_coa_type                  ON chart_of_accounts (type);
