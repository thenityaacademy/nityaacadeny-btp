-- Nitya Academy Staff Portal: Cloudflare D1 foundation
-- Execute against a dedicated D1 database after backend route implementation.
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS staff_sessions (
  token_hash TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS portal_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS staff_courses (
  course_id TEXT PRIMARY KEY,
  course_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  default_fee INTEGER,
  extra_logo_r2_key TEXT,
  extra_logo_active INTEGER NOT NULL DEFAULT 0,
  CHECK (extra_logo_active IN (0,1))
);
CREATE TABLE IF NOT EXISTS registration_sequences (
  sequence_key TEXT PRIMARY KEY,
  prefix TEXT NOT NULL,
  next_number INTEGER NOT NULL,
  end_number INTEGER NOT NULL,
  CHECK(next_number <= end_number+1)
);
CREATE TABLE IF NOT EXISTS student_applications (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('admission','scholarship')),
  form_number TEXT NOT NULL UNIQUE,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  student_name TEXT NOT NULL,
  mobile TEXT,
  course_id TEXT,
  fields_json TEXT NOT NULL,
  photo_r2_key TEXT,
  pdf_r2_key TEXT,
  payment_mode TEXT,
  fee_amount INTEGER,
  sheet_sync_status TEXT NOT NULL DEFAULT 'pending',
  sheet_last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS applications_staff_date ON student_applications(staff_id,created_at);
CREATE INDEX IF NOT EXISTS applications_sync ON student_applications(sheet_sync_status);
CREATE TABLE IF NOT EXISTS staff_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  action TEXT NOT NULL,
  reference_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Never store staff passwords in spreadsheets; staff account creation is admin API only.
-- Sequence allocation and application insert must be atomic and idempotent.
