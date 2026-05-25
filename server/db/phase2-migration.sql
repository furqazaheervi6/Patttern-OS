-- Phase 2 migration: user settings + API usage tracking
-- Run in Supabase SQL Editor

-- Key/value user settings (active AI model, preferences, etc.)
CREATE TABLE IF NOT EXISTS user_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default active model (global/anonymous row — user_id IS NULL)
INSERT INTO user_settings (key, value)
VALUES ('active_ai_model', '{"provider":"anthropic","model":"claude-sonnet-4-6"}')
ON CONFLICT (key) WHERE user_id IS NULL DO NOTHING;

-- Per-call API usage log for cost tracking
CREATE TABLE IF NOT EXISTS api_usage_log (
  id            BIGSERIAL PRIMARY KEY,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  endpoint      TEXT,
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd      NUMERIC(10,6) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_created  ON api_usage_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage_log (provider, created_at DESC);
