-- Phase 7: Self-learning & self-searching infrastructure

-- 1. User memories — persistent derived facts about each user
CREATE TABLE IF NOT EXISTS user_memories (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  key         TEXT        NOT NULL,
  value       TEXT        NOT NULL,
  confidence  FLOAT       DEFAULT 0.7,
  source      TEXT        DEFAULT 'system',   -- 'extraction', 'pattern_analysis', 'completion_stats'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_um_user_key
  ON user_memories (user_id, key)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_um_null_key
  ON user_memories (key)
  WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_um_user_id ON user_memories (user_id);

-- 2. Block completion tracking — add columns to calendar_blocks
ALTER TABLE calendar_blocks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS skipped_at   TIMESTAMPTZ;

-- 3. Initiative research — proactive research briefs per initiative
CREATE TABLE IF NOT EXISTS initiative_research (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID        REFERENCES users(id) ON DELETE CASCADE,
  initiative_id    BIGINT,
  initiative_name  TEXT        NOT NULL,
  query            TEXT        NOT NULL,
  summary          TEXT        NOT NULL,
  key_tactics      JSONB       DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ir_user_id       ON initiative_research (user_id);
CREATE INDEX IF NOT EXISTS idx_ir_initiative_id ON initiative_research (initiative_id);
CREATE INDEX IF NOT EXISTS idx_ir_created_at    ON initiative_research (created_at DESC);
