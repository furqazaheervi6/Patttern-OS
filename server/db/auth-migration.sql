-- Auth & multi-tenancy migration
-- Run in Supabase SQL Editor (after migrate-to-supabase.sql)

-- ── Users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  TEXT NOT NULL UNIQUE,
  password_hash          TEXT NOT NULL,
  name                   TEXT,
  mode                   TEXT NOT NULL DEFAULT 'personal',   -- 'personal' | 'operator'
  plan                   TEXT NOT NULL DEFAULT 'free',        -- 'free' | 'pro'
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  subscription_end       TIMESTAMPTZ,
  onboarded              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ── Execution Graph: Phase 2 ─────────────────────────────
CREATE TABLE IF NOT EXISTS initiatives (
  id              SERIAL PRIMARY KEY,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'paused' | 'completed' | 'archived'
  pillar_emphasis TEXT,                              -- primary pillar
  target_date     TEXT,
  domain          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestones (
  id             SERIAL PRIMARY KEY,
  initiative_id  INTEGER NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  sequence       INTEGER DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'in_progress' | 'completed'
  target_date    TEXT,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artifacts (
  id           SERIAL PRIMARY KEY,
  milestone_id INTEGER REFERENCES milestones(id) ON DELETE SET NULL,
  initiative_id INTEGER REFERENCES initiatives(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'link',        -- 'link' | 'doc' | 'figma' | 'repo' | 'note'
  title        TEXT NOT NULL,
  url          TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_initiatives_user ON initiatives (user_id, status);
CREATE INDEX IF NOT EXISTS idx_milestones_initiative ON milestones (initiative_id, sequence);

-- ── Add user_id to core tables (nullable — existing rows become "system" rows) ──
ALTER TABLE checkins        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE goals           ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE integrations    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE user_settings   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- calendar_blocks and plan_log already created in phase1-migration.sql; add user_id
ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE plan_log        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- ── Subscriptions (billing event log) ───────────────────
CREATE TABLE IF NOT EXISTS subscription_events (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  event_type  TEXT NOT NULL,
  stripe_id   TEXT,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
