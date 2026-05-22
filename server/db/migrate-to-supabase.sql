-- Patternos: Postgres/Supabase schema
-- Translated from SQLite schema.sql
-- Generated 2026-05-22

CREATE TABLE IF NOT EXISTS checkins (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,

  -- Physical
  sleep_hours NUMERIC,
  exercise INTEGER,
  energy_score INTEGER,
  nutrition_score INTEGER,

  -- Mental
  focus_score INTEGER,
  mood_score INTEGER,
  stress_score INTEGER,
  learning INTEGER,

  -- Financial
  productive_hours NUMERIC,
  milestone_hit INTEGER,
  revenue_note TEXT,
  runway_note TEXT,

  -- Spiritual
  reflection_done INTEGER,
  purpose_score INTEGER,
  gratitude_done INTEGER,
  alignment_score INTEGER,

  -- Computed scores
  physical_score NUMERIC,
  mental_score NUMERIC,
  financial_score NUMERIC,
  spiritual_score NUMERIC,
  overall_score NUMERIC,

  -- Notion sync
  notion_page_id TEXT,
  notion_synced_at TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digests (
  id SERIAL PRIMARY KEY,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  content TEXT NOT NULL,
  patterns_found TEXT,
  weakest_pillar TEXT,
  strongest_pillar TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (week_start, week_end)
);

CREATE TABLE IF NOT EXISTS pattern_alerts (
  id SERIAL PRIMARY KEY,
  detected_on TEXT NOT NULL,
  pillar_a TEXT,
  pillar_b TEXT,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  dismissed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notion_cache (
  id SERIAL PRIMARY KEY,
  page_id TEXT NOT NULL UNIQUE,
  page_date TEXT,
  raw_content TEXT,
  parsed_fields TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL,
  metric TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  target_label TEXT,
  description TEXT DEFAULT '',
  deadline TEXT,
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'habit',
  active INTEGER DEFAULT 1,
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled reminders for daily check-ins, reports, and goals
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checkin',
  time TEXT NOT NULL DEFAULT '08:00',
  days TEXT DEFAULT '1,2,3,4,5,6,7',
  integration TEXT,
  message TEXT,
  enabled INTEGER DEFAULT 1,
  last_triggered TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily evolution reports across all categories
CREATE TABLE IF NOT EXISTS daily_reports (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  scores TEXT,
  insights TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, category)
);

-- Imported files metadata
CREATE TABLE IF NOT EXISTS imports (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER,
  records_imported INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities: user-defined behaviors that affect pillar scores
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  impact TEXT NOT NULL DEFAULT 'positive',
  weight INTEGER NOT NULL DEFAULT 3,
  icon TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily activity log: which activities the user did each day
CREATE TABLE IF NOT EXISTS daily_activities (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  activity_id INTEGER NOT NULL,
  intensity NUMERIC DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (activity_id) REFERENCES activities(id)
);

-- Integration configs: API keys and settings for external services
CREATE TABLE IF NOT EXISTS integrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'api',
  api_key TEXT,
  endpoint TEXT,
  config TEXT DEFAULT '{}',
  enabled INTEGER DEFAULT 0,
  last_tested TEXT,
  status TEXT DEFAULT 'unconfigured',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date);
CREATE INDEX IF NOT EXISTS idx_daily_activities_date ON daily_activities(date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(date);
CREATE INDEX IF NOT EXISTS idx_goals_domain ON goals(domain);
CREATE INDEX IF NOT EXISTS idx_activities_domain ON activities(domain);
