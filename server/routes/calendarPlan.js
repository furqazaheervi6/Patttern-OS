const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { query, execute } = require('../db/database');
const { logUsage, getActiveModel } = require('../utils/usageTracker');
const { optionalAuth } = require('../middleware/auth');

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// HH:MM → minutes since midnight
function toMinutes(timeStr) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return h * 60 + m;
}

// Returns true if plan block overlaps any existing GCal event (5-min buffer)
function overlapsExisting(block, existingEvents) {
  const bStart = toMinutes(block.start);
  const bEnd   = toMinutes(block.end);
  for (const ev of existingEvents) {
    const dt = ev.start?.dateTime || ev.start?.date;
    const d  = dt ? dt.split('T')[0] : null;
    if (d !== block.date) continue;
    if (!ev.start?.dateTime) continue;
    const evDate    = new Date(ev.start.dateTime);
    const evEndDate = new Date(ev.end.dateTime);
    const evStart   = evDate.getHours() * 60 + evDate.getMinutes();
    const evEnd     = evEndDate.getHours() * 60 + evEndDate.getMinutes();
    if (bStart < evEnd - 5 && bEnd > evStart + 5) return true;
  }
  return false;
}

// Build the scheduling prompt — mode-aware (personal vs. operator)
function buildPrompt(dates, existingEvents, goals, checkin, history, mode = 'personal', initiatives = []) {
  const byDate = {};
  for (const e of existingEvents) {
    const dt = e.start?.dateTime || e.start?.date;
    const d = dt ? dt.split('T')[0] : null;
    if (!d) continue;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(e);
  }

  const daysSection = dates.map(date => {
    const evs = (byDate[date] || []).filter(e => e.start?.dateTime);
    const evStr = evs.length > 0
      ? evs.map(e => {
          const s  = new Date(e.start.dateTime);
          const en = new Date(e.end.dateTime);
          const sh = String(s.getHours()).padStart(2, '0');
          const sm = String(s.getMinutes()).padStart(2, '0');
          const eh = String(en.getHours()).padStart(2, '0');
          const em = String(en.getMinutes()).padStart(2, '0');
          return `  ✗ BLOCKED ${sh}:${sm}–${eh}:${em} → ${e.summary || 'Busy'}`;
        }).join('\n')
      : '  (calendar is clear — no blocked windows)';
    return `DATE: ${date}\nHARD BLOCKED WINDOWS (DO NOT SCHEDULE ANYTHING DURING THESE — not even 1 minute of overlap):\n${evStr}`;
  }).join('\n\n');

  const goalsStr = goals.length > 0
    ? goals.map(g => `  [${(g.domain || 'general').toUpperCase()}] ${g.title}${g.target_value ? ` — ${g.current_value || 0}/${g.target_value} ${g.metric || ''}` : ''}${g.deadline ? ` (due ${g.deadline})` : ''}`).join('\n')
    : '  (no active goals set)';

  const scoreStr = checkin
    ? `Physical ${checkin.physical_score ?? '-'} | Mental ${checkin.mental_score ?? '-'} | Financial ${checkin.financial_score ?? '-'} | Spiritual ${checkin.spiritual_score ?? '-'} | Overall ${checkin.overall_score ?? '-'}`
    : 'No recent check-in';

  const trendStr = history.length > 3
    ? (() => {
        const fields = ['physical_score', 'mental_score', 'financial_score', 'spiritual_score'];
        const avgs = {};
        for (const f of fields) {
          const vals = history.slice(0, 7).map(r => parseFloat(r[f])).filter(v => !isNaN(v));
          avgs[f.replace('_score', '')] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
        }
        return `7-day trend — Physical ${avgs.physical ?? '-'} | Mental ${avgs.mental ?? '-'} | Financial ${avgs.financial ?? '-'} | Spiritual ${avgs.spiritual ?? '-'}`;
      })()
    : '';

  const isOperator = mode === 'operator';

  const initiativesStr = initiatives.length > 0
    ? initiatives.slice(0, 5).map(i => `  [${(i.pillar_emphasis || 'general').toUpperCase()}] ${i.name}${i.target_date ? ` → due ${i.target_date}` : ''}`).join('\n')
    : '';

  const operatorContext = isOperator ? `
OPERATOR MODE — This user is a founder/operator. Apply the following:
• Execution Domains: Revenue (closing, prospecting, billing), Product (shipping, specs, testing), Pipeline (outreach, relationships), Conviction (prayer, reflection, alignment), Recovery (sleep quality, movement, decompression)
• MANDATORY minimums per day: 90min Revenue OR Product (whichever is the priority goal), 45min Pipeline, 30min Conviction, 45min Recovery
• Schedule deep work (90-120min) before noon when possible — protect cognitive peak hours
• Conviction blocks are non-negotiable — treat them like a board meeting
• Surface initiative-linked tasks directly by name (e.g. "PatternOS: write investor brief" not "work on project")
` : '';

  const operatorRules = isOperator ? `
OPERATOR-SPECIFIC RULES:
8a. Financial pillar = Revenue/Pipeline domain — use specific operator language (close deals, prospect, send invoices)
8b. Spiritual pillar = Conviction domain — Fajr, Quran, dhikr, reflection are valid spiritual blocks
8c. Mental pillar = Product/strategy domain — design sessions, writing, thinking, reading
8d. Physical pillar = Recovery domain — gym, walk, sleep wind-down, meals
8e. Never schedule more than 3 consecutive hours of any single pillar without a 20-30min break block
` : '';

  return `You are the scheduling intelligence inside PatternOS — an AI operating system for ${isOperator ? 'high-agency founders and operators who run their entire life — work, body, finances, and conviction — as one coherent execution system' : 'whole-self intelligence tracking Physical, Mental, Financial, and Spiritual pillars'}.

Generate a complete, optimized daily schedule for the following day(s).
${operatorContext}
${daysSection}

ACTIVE GOALS (build schedule around these specifically):
${goalsStr}
${initiativesStr ? `\nACTIVE INITIATIVES (tie blocks to these where possible):\n${initiativesStr}` : ''}
PILLAR SCORES (0-100, lower score = needs more focus this week):
${scoreStr}${trendStr ? `\n${trendStr}` : ''}

SCHEDULING RULES:
1. ABSOLUTE RULE — ZERO TOLERANCE: Never schedule ANY block that starts, ends, or overlaps (even by 1 minute) with a HARD BLOCKED window listed above.
2. Schedule spans 6:30 AM – 10:00 PM
3. Allocate more blocks to lower-scoring pillars
4. Be specific: "Prospect 5 leads for 47 Industries" not "work time"
5. Block types must cover: morning ritual, deep work, movement, meals/rest, evening wind-down
6. Realistic durations: 30min rituals, 60–90min deep work blocks, 30min meals
7. "pillar" must be exactly one of: physical, mental, financial, spiritual, personal
8. MANDATORY: Every single day MUST contain at least 2 blocks per pillar (physical, mental, financial, spiritual)
9. Open every day with a physical OR spiritual morning ritual and close with a spiritual reflection block
10. Distribute pillar blocks throughout the day — do NOT cluster all financial blocks together
11. Schedule blocks BACK-TO-BACK around blocked windows — no dead time${operatorRules}

Return ONLY a raw JSON array — no markdown, no explanation, no code fences:
[
  {
    "date": "YYYY-MM-DD",
    "start": "HH:MM",
    "end": "HH:MM",
    "title": "Specific activity name",
    "pillar": "physical",
    "description": "One concrete sentence describing the action",
    "priority": "high"
  }
]`;
}

// Persist blocks to calendar_blocks table
async function saveBlocksToDB(blocks, userId = null) {
  if (!blocks.length) return;
  for (const block of blocks) {
    await execute(
      `INSERT INTO calendar_blocks
         (id, date, start_time, end_time, title, pillar, description, priority, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [block.id, block.date, block.start, block.end, block.title, block.pillar, block.description || null, block.priority || 'medium', userId]
    );
  }
}

// Write a plan_log entry and return its id
async function logPlan({ trigger, date, blocksGenerated, blocksDeconflicted, durationMs, error, model, userId = null }) {
  try {
    const rows = await execute(
      `INSERT INTO plan_log (trigger, date, blocks_generated, blocks_deconflicted, model_used, duration_ms, error, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [trigger, date, blocksGenerated, blocksDeconflicted, model || 'claude-sonnet-4-6', durationMs, error || null, userId]
    );
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

// Soft-delete existing active blocks for dates; return their gcal_event_ids for cleanup
async function softDeleteBlocks(dates, userId = null) {
  const gcalIds = [];
  const uf = userId ? 'AND user_id = ?' : 'AND user_id IS NULL';
  for (const date of dates) {
    try {
      const existing = await query(
        `SELECT id, gcal_event_id FROM calendar_blocks WHERE date = ? ${uf} AND replaced_at IS NULL`,
        userId ? [date, userId] : [date]
      );
      for (const b of existing) {
        if (b.gcal_event_id) gcalIds.push(b.gcal_event_id);
      }
      if (existing.length > 0) {
        await execute(
          `UPDATE calendar_blocks SET replaced_at = NOW() WHERE date = ? ${uf} AND replaced_at IS NULL`,
          userId ? [date, userId] : [date]
        );
      }
    } catch {
      // Table may not exist yet; continue
    }
  }
  return gcalIds;
}

// POST /api/calendar/plan
// Body: { dates, existingEvents?, goals?, checkin?, history?, replan? }
router.post('/plan', optionalAuth, async (req, res) => {
  const { dates, existingEvents = [], goals = [], checkin = null, history = [], replan = false, mode = 'personal', initiatives = [] } = req.body;
  if (!dates || !dates.length) return res.status(400).json({ error: 'dates required' });

  const userId = req.user?.id || null;
  const t0 = Date.now();
  let gcalDeleted = 0;

  // On re-plan: soft-delete old blocks and clean up GCal events
  if (replan) {
    const gcalIds = await softDeleteBlocks(dates, userId);
    if (gcalIds.length > 0) {
      try {
        const { deleteEvent } = require('../services/googleService');
        for (const id of gcalIds) {
          try { await deleteEvent(id); gcalDeleted++; } catch {}
        }
      } catch {}
    }
  }

  const prompt = buildPrompt(dates, existingEvents, goals, checkin, history, mode, initiatives);

  try {
    const { model: activeModel } = await getActiveModel(userId);
    const client = getClient();
    const msg = await client.messages.create({
      model: activeModel,
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });
    logUsage({
      provider: 'anthropic',
      model: activeModel,
      endpoint: 'calendar/plan',
      inputTokens: msg.usage?.input_tokens ?? 0,
      outputTokens: msg.usage?.output_tokens ?? 0,
      userId,
    });

    let text = (msg.content[0]?.text || '').trim()
      .replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let schedule;
    try {
      const direct = JSON.parse(text);
      if (Array.isArray(direct)) schedule = direct;
    } catch {}

    if (!schedule) {
      const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!match) {
        await logPlan({ trigger: replan ? 'replan' : 'manual', date: dates[0], blocksGenerated: 0, blocksDeconflicted: 0, durationMs: Date.now() - t0, error: 'No JSON schedule in response', model: activeModel });
        return res.status(500).json({ error: 'No JSON schedule in response', raw: text.slice(0, 500) });
      }
      schedule = JSON.parse(match[0]);
    }

    // Server-side deconfliction
    const clean = schedule.filter(block => !overlapsExisting(block, existingEvents));
    const deconflicted = schedule.length - clean.length;

    // Assign stable UUIDs
    const blocks = clean.map(block => ({ ...block, id: crypto.randomUUID() }));

    // Persist to DB (graceful — tables may not exist until migration is run)
    try { await saveBlocksToDB(blocks, userId); } catch {}

    // Log
    await logPlan({
      trigger: replan ? 'replan' : 'manual',
      date: dates[0],
      blocksGenerated: blocks.length,
      blocksDeconflicted: deconflicted,
      durationMs: Date.now() - t0,
      error: null,
      model: activeModel,
      userId,
    });

    res.json({ schedule: blocks, dates, count: blocks.length, deconflicted, gcalDeleted });
  } catch (err) {
    await logPlan({ trigger: replan ? 'replan' : 'manual', date: dates[0], blocksGenerated: 0, blocksDeconflicted: 0, durationMs: Date.now() - t0, error: err.message, userId });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/blocks?date=YYYY-MM-DD
// Returns active (non-replaced) blocks for a date from DB
router.get('/blocks', optionalAuth, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date required' });
  try {
    const userId = req.user?.id || null;
    const uf = userId ? 'AND (user_id = ? OR user_id IS NULL)' : 'AND user_id IS NULL';
    const blocks = await query(
      `SELECT id, date, start_time AS start, end_time AS end, title, pillar, description, priority, intent, linked_goal_id, gcal_event_id
       FROM calendar_blocks
       WHERE date = ? ${uf} AND replaced_at IS NULL
       ORDER BY start_time`,
      userId ? [date, userId] : [date]
    );
    res.json({ blocks, date });
  } catch (err) {
    // Table may not exist yet
    res.json({ blocks: [], date });
  }
});

// PATCH /api/calendar/blocks/:id/gcal — update gcal_event_id after sync
router.patch('/blocks/:id/gcal', async (req, res) => {
  const { id } = req.params;
  const { gcal_event_id } = req.body;
  try {
    await execute(
      `UPDATE calendar_blocks SET gcal_event_id = ?, gcal_synced_at = NOW() WHERE id = ?`,
      [gcal_event_id, id]
    );
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// POST /api/calendar/blocks/sync-log — update plan_log with sync results
router.post('/blocks/sync-log', async (req, res) => {
  const { date, blocks_synced, errors = [] } = req.body;
  try {
    await execute(
      `UPDATE plan_log SET blocks_synced = ?, sync_errors = ?
       WHERE date = ? AND id = (SELECT id FROM plan_log WHERE date = ? ORDER BY created_at DESC LIMIT 1)`,
      [blocks_synced, JSON.stringify(errors), date, date]
    );
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

module.exports = router;
