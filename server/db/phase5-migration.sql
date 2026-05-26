-- Phase 5: Add user_id to api_usage_log for per-user cost tracking

ALTER TABLE api_usage_log
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage_log (user_id, created_at DESC);

-- Fix user_settings: change PRIMARY KEY from (key) to (key, user_id) for multi-user
-- Skip if already correct
DO $$
BEGIN
  -- Add composite unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_settings_key_user_id_key'
      AND contype = 'u'
  ) THEN
    -- Drop the old PK and recreate with composite key
    ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS id BIGSERIAL;
    ALTER TABLE user_settings ADD CONSTRAINT user_settings_key_user_id_key UNIQUE (key, user_id);
  END IF;
END $$;
