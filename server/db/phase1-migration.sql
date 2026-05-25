-- Phase 1: First-class pillars, persistent calendar blocks, plan audit log
-- Run this in Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── 1. Pillars as first-class objects ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pillars (
  id          TEXT PRIMARY KEY,
  label       TEXT        NOT NULL,
  color       TEXT        NOT NULL,
  icon        TEXT        NOT NULL DEFAULT '◎',
  description TEXT,
  sort_order  INTEGER     DEFAULT 0
);

INSERT INTO pillars (id, label, color, icon, description, sort_order) VALUES
  ('physical',  'Physical',  '#22C55E', '🏋️', 'Body, movement, energy, and recovery',                        1),
  ('mental',    'Mental',    '#60A5FA', '🧠', 'Focus, learning, creativity, and clarity',                    2),
  ('financial', 'Financial', '#FBBF24', '💰', 'Revenue, pipeline, strategic work, and financial discipline', 3),
  ('spiritual', 'Spiritual', '#C084FC', '🕊️', 'Prayer, reflection, gratitude, and conviction',              4),
  ('personal',  'Personal',  '#94A3B8', '◇',  'Family, rest, hobbies, and personal time',                   5)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Persistent calendar blocks (source of truth) ───────────────────────────
CREATE TABLE IF NOT EXISTS calendar_blocks (
  id                   TEXT        PRIMARY KEY,          -- stable UUID
  date                 TEXT        NOT NULL,             -- YYYY-MM-DD
  start_time           TEXT        NOT NULL,             -- HH:MM
  end_time             TEXT        NOT NULL,             -- HH:MM
  title                TEXT        NOT NULL,
  pillar               TEXT        NOT NULL,
  description          TEXT,
  priority             TEXT        DEFAULT 'medium',
  intent               TEXT,                             -- why this block exists
  linked_goal_id       INTEGER     REFERENCES goals(id),
  linked_initiative_id INTEGER,                         -- Phase 2 (initiatives table)
  gcal_event_id        TEXT,                             -- Google Calendar event ID
  gcal_synced_at       TIMESTAMPTZ,
  replaced_at          TIMESTAMPTZ,                     -- set on replan (soft-delete)
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cal_blocks_date
  ON calendar_blocks(date);
CREATE INDEX IF NOT EXISTS idx_cal_blocks_active
  ON calendar_blocks(date, replaced_at)
  WHERE replaced_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cal_blocks_gcal
  ON calendar_blocks(gcal_event_id)
  WHERE gcal_event_id IS NOT NULL;

-- ── 3. Plan audit log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_log (
  id                   SERIAL      PRIMARY KEY,
  trigger              TEXT        NOT NULL DEFAULT 'manual', -- 'manual' | 'replan' | 'agent_chat'
  date                 TEXT        NOT NULL,
  blocks_generated     INTEGER     DEFAULT 0,
  blocks_deconflicted  INTEGER     DEFAULT 0,
  blocks_synced        INTEGER     DEFAULT 0,
  gcal_deleted         INTEGER     DEFAULT 0,
  sync_errors          JSONB       DEFAULT '[]',
  model_used           TEXT        DEFAULT 'claude-sonnet-4-6',
  duration_ms          INTEGER,
  error                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_log_date    ON plan_log(date);
CREATE INDEX IF NOT EXISTS idx_plan_log_created ON plan_log(created_at);
