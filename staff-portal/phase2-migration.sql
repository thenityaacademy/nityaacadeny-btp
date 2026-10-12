-- Phase 2 Staff Login rate limiting (safe, additive migration).
-- Run on isolated Preview D1 first. Apply to Production D1 only once Preview passes.
-- NO DROP, ALTER, or changes to existing Student/Staff rows.
CREATE TABLE IF NOT EXISTS staff_login_attempts (
  attempt_key TEXT PRIMARY KEY,
  window_start_ms INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS staff_login_attempts_window
  ON staff_login_attempts(window_start_ms);
