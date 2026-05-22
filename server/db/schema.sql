CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,

  -- Physical
  sleep_hours REAL,
  exercise INTEGER,
  energy_score INTEGER,
  nutrition_score INTEGER,

  -- Mental
  focus_score INTEGER,
  mood_score INTEGER,
  stress_score INTEGER,
  learning INTEGER,

  -- Financial
  productive_hours REAL,
  milestone_hit INTEGER,
  revenue_note TEXT,
  runway_note TEXT,

  -- Spiritual
  reflection_done INTEGER,
  purpose_score INTEGER,
  gratitude_done INTEGER,
  alignment_score INTEGER,

  -- Computed scores
  physical_score REAL,
  mental_score REAL,
  financial_score REAL,
  spiritual_score REAL,
  overall_score REAL,

  -- Notion sync
  notion_page_id TEXT,
  notion_synced_at TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS digests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  content TEXT NOT NULL,
  patterns_found TEXT,
  weakest_pillar TEXT,
  strongest_pillar TEXT,
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pattern_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  detected_on TEXT NOT NULL,
  pillar_a TEXT,
  pillar_b TEXT,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  dismissed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notion_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id TEXT NOT NULL UNIQUE,
  page_date TEXT,
  raw_content TEXT,
  parsed_fields TEXT,
  cached_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL,
  metric TEXT NOT NULL,
  target_value REAL NOT NULL,
  current_value REAL DEFAULT 0,
  target_label TEXT,
  description TEXT DEFAULT '',
  deadline TEXT,
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'habit',
  active INTEGER DEFAULT 1,
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled reminders for daily check-ins, reports, and goals
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checkin',
  time TEXT NOT NULL DEFAULT '08:00',
  days TEXT DEFAULT '1,2,3,4,5,6,7',
  integration TEXT,
  message TEXT,
  enabled INTEGER DEFAULT 1,
  last_triggered TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Daily evolution reports across all categories
CREATE TABLE IF NOT EXISTS daily_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  scores TEXT,
  insights TEXT,
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Imported files metadata
CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER,
  records_imported INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Activities: user-defined behaviors that affect pillar scores
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  impact TEXT NOT NULL DEFAULT 'positive',
  weight INTEGER NOT NULL DEFAULT 3,
  icon TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Daily activity log: which activities the user did each day
CREATE TABLE IF NOT EXISTS daily_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  activity_id INTEGER NOT NULL,
  intensity REAL DEFAULT 1.0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id)
);

-- Integration configs: API keys and settings for external services
CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'api',
  api_key TEXT,
  endpoint TEXT,
  config TEXT DEFAULT '{}',
  enabled INTEGER DEFAULT 0,
  last_tested TEXT,
  status TEXT DEFAULT 'unconfigured',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
