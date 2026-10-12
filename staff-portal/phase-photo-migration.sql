-- Step 1 (Photo Upload): private draft file references only.
-- Never stores student Aadhaar, student name, or image bytes in D1.
-- Apply to isolated Preview D1 and verify with synthetic images BEFORE Production.
CREATE TABLE IF NOT EXISTS staff_photo_drafts (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  kind TEXT NOT NULL CHECK(kind IN ('admission','scholarship')),
  drive_file_id TEXT,
  mime TEXT NOT NULL CHECK(mime IN ('image/png','image/jpeg')),
  size_bytes INTEGER NOT NULL CHECK(size_bytes BETWEEN 1 AND 2500000),
  status TEXT NOT NULL DEFAULT 'uploading'
    CHECK(status IN ('uploading','ready')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS staff_photo_drafts_owner
  ON staff_photo_drafts(staff_id,status,expires_at);
CREATE INDEX IF NOT EXISTS staff_photo_drafts_expiry
  ON staff_photo_drafts(expires_at,status);
