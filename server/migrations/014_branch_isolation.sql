-- Tambah branch_id ke tabel kritis yang belum punya isolasi cabang.
-- NULL = data milik semua cabang (backward-compatible dengan data lama).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE grooming_bookings
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE grooming_sessions
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE hotel_reservations
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_branch_id          ON invoices (branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_branch_id       ON stock_items (branch_id);
CREATE INDEX IF NOT EXISTS idx_grooming_bookings_branch_id ON grooming_bookings (branch_id);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_branch_id ON hotel_reservations (branch_id);
