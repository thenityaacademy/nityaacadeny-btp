-- Additive only. For the Student Application workflow. No existing rows changed.
ALTER TABLE student_applications ADD COLUMN photo_draft_id TEXT;
ALTER TABLE student_applications ADD COLUMN document_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE student_applications ADD COLUMN document_last_error TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_app_photo_draft_unique
  ON student_applications(photo_draft_id) WHERE photo_draft_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_app_pending
  ON student_applications(document_status,sheet_sync_status);
