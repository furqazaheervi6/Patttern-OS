-- Phase 3: Per-user data isolation
-- Fully idempotent — safe to re-run

-- ── checkins: replace single-date unique with per-user partial indexes ──────
ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS checkins_date_user
  ON checkins (date, user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS checkins_date_null_user
  ON checkins (date) WHERE user_id IS NULL;

-- ── user_settings: add surrogate PK + per-user partial unique indexes ────────
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS id BIGSERIAL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'user_settings'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE user_settings ADD PRIMARY KEY (id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_settings_key_user
  ON user_settings (key, user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_settings_key_null_user
  ON user_settings (key) WHERE user_id IS NULL;

-- ── performance indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plan_log_user
  ON plan_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_blocks_user_date
  ON calendar_blocks (user_id, date) WHERE replaced_at IS NULL;
