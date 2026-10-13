-- Nitya Academy Staff form correction and soft removal, additive migration.
-- Important: Existing form_number remains UNIQUE and is NEVER erased/reassigned.
-- No documents, Sheets or Drive files are physically deleted by staff removal.
ALTER TABLE student_applications ADD COLUMN staff_hidden_at TEXT;
ALTER TABLE student_applications ADD COLUMN revised_at TEXT;
ALTER TABLE student_applications ADD COLUMN revision_number INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS student_applications_staff_visibility
  ON student_applications(staff_id,staff_hidden_at,created_at);
CREATE TABLE IF NOT EXISTS staff_form_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL REFERENCES student_applications(id),
  staff_id TEXT NOT NULL REFERENCES staff(id),
  action TEXT NOT NULL CHECK(action IN ('edit','hide','restore')),
  revision_number INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS staff_form_audit_application
  ON staff_form_audit(application_id,created_at);
