-- Phase 3: Per-user data isolation
-- Run in Supabase SQL Editor after auth-migration.sql

-- ── checkins: replace single-date unique with per-user partial indexes ──────
-- Drop the original UNIQUE constraint on date
ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_date_key;

-- Allow per-user upserts:
--   authenticated rows: UNIQUE on (date, user_id)
--   unauthenticated rows (legacy): UNIQUE on date WHERE user_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS checkins_date_user
  ON checkins (date, user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS checkins_date_null_user
  ON checkins (date) WHERE user_id IS NULL;

-- ── user_settings: replace single-key PK with per-user partial indexes ──────
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;

-- Add a surrogate PK if one doesn't exist
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_id_pkey;
ALTER TABLE user_settings ADD PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS user_settings_key_user
  ON user_settings (key, user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_settings_key_null_user
  ON user_settings (key) WHERE user_id IS NULL;

-- ── plan_log: index for per-user queries ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plan_log_user ON plan_log (user_id, created_at DESC);

-- ── calendar_blocks: index for per-user date queries ────────────────────────
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_user_date
  ON calendar_blocks (user_id, date) WHERE replaced_at IS NULL;
