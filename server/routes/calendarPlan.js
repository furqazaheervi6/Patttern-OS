const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function fmtTime(isoString) {
  if (!isoString) return '?';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return isoString; }
}

// Convert "HH:MM" to total minutes since midnight
function toMinutes(timeStr) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return h * 60 + m;
}

// Check if a plan block overlaps with any existing GCal event (with 5-min buffer)
function overlapsExisting(block, existingEvents) {
  const bStart = toMinutes(block.start);
  const bEnd   = toMinutes(block.end);
  for (const ev of existingEvents) {
    const dt = ev.start?.dateTime || ev.start?.date;
    const d  = dt ? dt.split('T')[0] : null;
    if (d !== block.date) continue;
    if (!ev.start?.dateTime) continue; // skip all-day events
    const evDate    = new Date(ev.start.dateTime);
    const evEndDate = new Date(ev.end.dateTime);
    const evStart   = evDate.getHours() * 60 + evDate.getMinutes();
    const evEnd     = evEndDate.getHours() * 60 + evEndDate.getMinutes();
    if (bStart < evEnd - 5 && bEnd > evStart + 5) return true;
  }
  return false;
}

// POST /api/calendar/plan
// Body: { dates: ['2026-05-24'], existingEvents: [], goals: [], checkin: {}, history: [] }
router.post('/plan', async (req, res) => {
  const { dates, existingEvents = [], goals = [], checkin = null, history = [] } = req.body;
  if (!dates || !dates.length) return res.status(400).json({ error: 'dates required' });

  // Group existing events by date
  const byDate = {};
  for (const e of existingEvents) {
    const dt = e.start?.dateTime || e.start?.date;
    const d = dt ? dt.split('T')[0] : null;
    if (!d) continue;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(e);
  }

  const daysSection = dates.map(date => {
    const evs = (byDate[date] || []).filter(e => e.start?.dateTime); // only timed events
    const evStr = evs.length > 0
      ? evs.map(e => {
          const s = new Date(e.start.dateTime);
          const en = new Date(e.end.dateTime);
          const sh = String(s.getHours()).padStart(2,'0');
          const sm = String(s.getMinutes()).padStart(2,'0');
          const eh = String(en.getHours()).padStart(2,'0');
          const em = String(en.getMinutes()).padStart(2,'0');
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

  const prompt = `You are the scheduling intelligence inside PatternOS — a whole-self intelligence platform tracking Physical, Mental, Financial, and Spiritual life pillars.

Generate a complete, optimized daily schedule for the following day(s).

${daysSection}

ACTIVE GOALS (build schedule around these specifically):
${goalsStr}

PILLAR SCORES (0-100, lower score = needs more focus this week):
${scoreStr}${trendStr ? `\n${trendStr}` : ''}

SCHEDULING RULES:
1. ABSOLUTE RULE — ZERO TOLERANCE: Never schedule ANY block that starts, ends, or overlaps (even by 1 minute) with a HARD BLOCKED window listed above. Leave those time ranges completely empty.
2. Schedule spans 6:30 AM – 10:00 PM
3. Allocate more blocks to lower-scoring pillars
4. Be specific: "Prospect 5 leads for 47 Industries" not "work time"
5. Block types must cover: morning ritual, deep work, movement, meals/rest, evening wind-down
6. Realistic durations: 30min rituals, 60–90min deep work blocks, 30min meals
7. "pillar" must be exactly one of: physical, mental, financial, spiritual, personal
8. MANDATORY: Every single day MUST contain at least 2 blocks per pillar (physical, mental, financial, spiritual)
   - physical: morning movement, workout, walk, sport, stretching, yoga
   - mental: learning, reading, deep focus work, meditation, journaling
   - financial: revenue work, client outreach, business development, strategic tasks
   - spiritual: prayer, gratitude practice, reflection, journaling, meditation
9. Open every day with a physical block and close every day with a spiritual reflection block
10. Distribute pillar blocks throughout the day — do NOT cluster all financial blocks together
11. Schedule blocks BACK-TO-BACK around blocked windows — no dead time, no padding around existing events

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

  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    let text = (msg.content[0]?.text || '').trim();

    // Strip markdown code fences
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let schedule;
    try {
      const direct = JSON.parse(text);
      if (Array.isArray(direct)) schedule = direct;
    } catch {}

    if (!schedule) {
      const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!match) return res.status(500).json({ error: 'No JSON schedule in response', raw: text.slice(0, 500) });
      schedule = JSON.parse(match[0]);
    }

    // Server-side deconfliction: remove any blocks that still overlap existing events
    const clean = schedule.filter(block => !overlapsExisting(block, existingEvents));
    const removed = schedule.length - clean.length;

    res.json({ schedule: clean, dates, count: clean.length, deconflicted: removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
