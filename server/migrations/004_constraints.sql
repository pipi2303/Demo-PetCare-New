-- Business-logic constraints at the DB layer so app-code bypasses cannot
-- corrupt core state (e.g. a bad migration or direct psql query).

ALTER TABLE ambulance_units
  ADD CONSTRAINT chk_ambulance_unit_status
  CHECK (status IN ('available', 'assigned', 'maintenance'));

ALTER TABLE ambulance_requests
  ADD CONSTRAINT chk_ambulance_urgency
  CHECK (urgency IN ('emergency', 'urgent', 'normal')),
  ADD CONSTRAINT chk_ambulance_status
  CHECK (status IN ('received','triaged','assigned','en_route','arrived','patient_onboard','at_clinic','handed_over','closed','cancelled'));

ALTER TABLE telehealth_sessions
  ADD CONSTRAINT chk_telehealth_status
  CHECK (status IN ('scheduled','waiting_room','in_progress','completed','cancelled','no_show'));

ALTER TABLE invoices
  ADD CONSTRAINT chk_invoice_status
  CHECK (status IN ('Belum Dibayar','Lunas','Cicilan','Batal'));

ALTER TABLE customers
  ADD CONSTRAINT chk_membership_tier
  CHECK (membership_tier IN ('Silver','Gold','Platinum'));
