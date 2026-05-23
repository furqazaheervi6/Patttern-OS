# PatternOS

A personal intelligence dashboard tracking four pillars of health: Physical, Mental, Financial, and Spiritual. Locally hosted, syncs with Notion and Google Calendar, with Claude AI pattern detection.

## Quick Start

### 1. Install dependencies
```bash
npm run setup
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

### 3. Add your API keys to `.env`
```
ANTHROPIC_API_KEY=sk-ant-...
NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=your-database-id
```

### 4. Run the app
```bash
npm run dev
```

Opens at **http://localhost:5173** (frontend) + **http://localhost:3001** (API).

---

## Integrations

### Anthropic / Claude AI
- Get your key at https://console.anthropic.com
- Powers weekly digests, pattern alerts, and Notion journal analysis

### Notion
1. Go to https://www.notion.so/my-integrations → Create integration
2. Connect it to your journal database: open the database → Share → Invite your integration
3. Copy the database ID from the URL (the long string after the last `/` and before `?`)
4. Paste into `.env` as `NOTION_DATABASE_ID`

### Google Calendar
1. Go to https://console.cloud.google.com → Enable Google Calendar API
2. Create OAuth 2.0 credentials (Desktop app type)
3. Download as `credentials.json` to the project root
4. Visit `http://localhost:3001/api/google/auth` to authorize
5. A browser window will open — sign in and allow access

---

## Architecture

```
Frontend:  React 18 + Vite (port 5173)
Backend:   Node.js + Express (port 3001)
Database:  SQLite via node-sqlite3-wasm (patternos.db)
AI:        Anthropic Claude (claude-sonnet-4-20250514)
Cron:      Weekly digest: Monday 8AM | Notion sync: Daily 6AM
```

## Pillar Scoring (0–100)

| Pillar | Inputs | Weights |
|--------|--------|---------|
| Physical | Sleep, Exercise, Energy, Nutrition | 25 pts each |
| Mental | Focus, Mood, Stress (inverted), Learning | 30/30/25/15 |
| Financial | Hours (50), Milestone (30), Revenue (20) | Max 50/30/20 |
| Spiritual | Reflection (25), Purpose (30), Gratitude (20), Alignment (25) | — |

## Manual Operations

```bash
# Generate a weekly digest manually
curl -X POST http://localhost:3001/api/agent/digest

# Force Notion sync
curl http://localhost:3001/api/notion/sync

# Check server health
curl http://localhost:3001/api/health
```
