const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { query, queryOne } = require('../db/database');
const { getEventsInRange } = require('../services/googleService');
const { logUsage } = require('../utils/usageTracker');
const { optionalAuth } = require('../middleware/auth');

const ALLOWED_MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
};

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function buildContext(currentDate, userId = null) {
  const today = currentDate || new Date().toISOString().split('T')[0];
  try {
    const uf = userId ? 'AND (user_id = $1 OR user_id IS NULL)' : 'AND user_id IS NULL';
    const p = userId ? [userId] : [];
    const [checkinToday, recent, goals, notionFeed, activities, gcalEvents] = await Promise.all([
      queryOne(`SELECT * FROM checkins WHERE 1=1 ${uf} ORDER BY date DESC LIMIT 1`, p),
      query(`SELECT date, physical_score, mental_score, financial_score, spiritual_score, overall_score FROM checkins WHERE 1=1 ${uf} ORDER BY date DESC LIMIT 14`, p),
      query(`SELECT title, domain, metric, target_value, current_value, deadline FROM goals WHERE active = 1 AND completed = 0 ${uf} ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END LIMIT 10`, p),
      query("SELECT page_date, raw_content, parsed_fields FROM notion_cache ORDER BY page_date DESC NULLS LAST LIMIT 7"),
      query("SELECT a.name, a.domain, a.impact FROM daily_activities da JOIN activities a ON a.id = da.activity_id WHERE da.date = (SELECT MAX(date) FROM daily_activities) LIMIT 10"),
      getEventsInRange(today, today).catch(() => []),
    ]);

    const notionEntries = notionFeed.map(p => {
      const raw = typeof p.raw_content === 'string' ? JSON.parse(p.raw_content || '{}') : (p.raw_content || {});
      let pf = null;
      try { pf = p.parsed_fields ? JSON.parse(p.parsed_fields) : null; } catch {}
      const pillarNotes = pf
        ? Object.entries(pf).filter(([, v]) => v?.notes).map(([k, v]) => `  ${k}: ${v.notes}`).join('\n')
        : null;
      return {
        date: p.page_date,
        title: raw.title || 'Untitled',
        full_text: raw.full_text ? raw.full_text.slice(0, 800) : null,
        pillar_notes: pillarNotes,
        summary: pf?.summary || null,
      };
    });

    return { today: checkinToday, recent, goals, notionEntries, activities, gcalEvents, todayDate: today };
  } catch {
    return { today: null, recent: [], goals: [], notionEntries: [], activities: [], gcalEvents: [], todayDate: today };
  }
}

function buildSystemPrompt(ctx, calendarPlan = null, currentDate = null) {
  const { today, recent, goals, notionEntries, activities, gcalEvents, todayDate } = ctx;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = todayDate;

  const scoreBlock = today
    ? `Today's scores (0-100): Physical ${today.physical_score ?? 'N/A'} | Mental ${today.mental_score ?? 'N/A'} | Financial ${today.financial_score ?? 'N/A'} | Spiritual ${today.spiritual_score ?? 'N/A'} | Overall ${today.overall_score ?? 'N/A'}`
    : 'No check-in yet today.';

  const trendBlock = recent.length > 0
    ? `Last ${recent.length} days:\n` + recent.map(r =>
        `  ${r.date}: P${r.physical_score ?? '-'} M${r.mental_score ?? '-'} F${r.financial_score ?? '-'} S${r.spiritual_score ?? '-'}`
      ).join('\n')
    : 'No historical data yet.';

  const goalsBlock = goals.length > 0
    ? goals.map(g => `  - [${g.domain}] ${g.title}: ${g.current_value}/${g.target_value} ${g.metric}${g.deadline ? ` (due ${g.deadline})` : ''}`).join('\n')
    : 'No active goals set.';

  const notionBlock = notionEntries.length > 0
    ? notionEntries.map(e => {
        let out = `  ── ${e.date}: ${e.title}`;
        if (e.summary) out += `\n     Summary: ${e.summary}`;
        if (e.pillar_notes) out += `\n${e.pillar_notes.split('\n').map(l => '     ' + l).join('\n')}`;
        else if (e.full_text) out += `\n     ${e.full_text.slice(0, 300).replace(/\n/g, ' ')}`;
        return out;
      }).join('\n')
    : 'No journal entries synced yet.';

  const activityBlock = activities.length > 0
    ? activities.map(a => `  - ${a.name} (${a.domain}, ${a.impact})`).join('\n')
    : 'No activities logged recently.';

  // Google Calendar events for today — hard blocks
  const timedGcal = gcalEvents.filter(e => e.start?.dateTime);
  const gcalBlock = timedGcal.length > 0
    ? timedGcal.map(e => {
        const s = new Date(e.start.dateTime);
        const en = new Date(e.end.dateTime);
        const fmt = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `  ✗ ${fmt(s)}–${fmt(en)}: ${e.summary || 'Busy'}`;
      }).join('\n')
    : '  (no Google Calendar events today)';

  // Current day plan
  let planBlock = '';
  if (calendarPlan) {
    const focusDate = currentDate || dateStr;
    const blocks = calendarPlan[focusDate] || [];
    if (blocks.length > 0) {
      planBlock = `\nCURRENT AI DAY PLAN (${focusDate}):\n` +
        blocks.map(b => `  ${b.start}–${b.end} [${b.pillar}] ${b.title}`).join('\n');
    } else {
      planBlock = `\nCURRENT AI DAY PLAN: (none generated yet)`;
    }
  }

  return `You are PatternOS Intelligence — a sharp, action-taking personal AI agent inside PatternOS.

TODAY: ${dateStr} · Current time: ${timeStr}

RESPONSE RULES:
→ 2-4 sentences max unless user asks for detail
→ Lead with the answer or action — no preamble
→ No markdown headers. No bullet lists unless asked for breakdown
→ Reference actual numbers from data when relevant

PILLARS: Physical · Mental · Financial · Spiritual

━━━ AGENT CALENDAR ACTIONS ━━━
You are an ACTIVE AGENT. When the user asks you to plan, schedule, fill, or adjust their day:
→ DO IT IMMEDIATELY — generate the blocks and append CALENDAR_ACTIONS
→ DO NOT just describe what you would do — take the action
→ DO NOT ask for confirmation — act, then briefly summarize what you did

HARD BLOCKED TIMES TODAY (Google Calendar — never schedule over these):
${gcalBlock}

When generating schedule blocks:
- Use date: "${dateStr}"
- Never overlap with the hard blocked times above
- Cover the requested time range
- Include all 4 pillars: physical, mental, financial, spiritual
- Be specific: "Prospect 5 leads for 47 Industries" not "work time"
- Pillar must be exactly one of: physical, mental, financial, spiritual, personal

Actions format — append at end of response when making ANY schedule change:
<CALENDAR_ACTIONS>[{"action":"add","date":"YYYY-MM-DD","start":"HH:MM","end":"HH:MM","title":"...","pillar":"physical","description":"...","priority":"high"},...]</CALENDAR_ACTIONS>

Valid actions: "add" (new block) | "remove" (date+start) | "update" (date+start + new fields)
ALWAYS include CALENDAR_ACTIONS when the user asks to plan, schedule, add, move, remove, or change blocks.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━ USER DATA ━━━
${scoreBlock}
${trendBlock}
GOALS:
${goalsBlock}
NOTION: ${notionBlock}
ACTIVITIES: ${activityBlock}${planBlock}
━━━━━━━━━━━━━━━`;
}

function normaliseMessages(messages) {
  return messages.slice(-20).map(msg => {
    if (typeof msg.content === 'string') return msg;
    const blocks = msg.content.map(block => {
      if (block.type === 'text') return block;
      if (block.type === 'image') return { type: 'image', source: { type: 'base64', media_type: block.mediaType, data: block.data } };
      if (block.type === 'document') return { type: 'document', source: { type: 'base64', media_type: block.mediaType, data: block.data } };
      return block;
    });
    return { role: msg.role, content: blocks };
  });
}

// POST /api/chat — streaming, multimodal, model-selectable
router.post('/', optionalAuth, async (req, res) => {
  const { messages, model = 'haiku', calendarPlan = null, currentDate = null } = req.body;
  const userId = req.user?.id || null;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const selectedModel = ALLOWED_MODELS[model] || ALLOWED_MODELS.haiku;
  // Bump max tokens — agent responses with CALENDAR_ACTIONS can be longer
  const maxTokens = model === 'sonnet' ? 2500 : 1200;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const ctx = await buildContext(currentDate, userId);
    const systemPrompt = buildSystemPrompt(ctx, calendarPlan, currentDate);
    const client = getClient();
    const normalisedMessages = normaliseMessages(messages);

    const stream = client.messages.stream({
      model: selectedModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: normalisedMessages,
    });

    let inputTokens = 0, outputTokens = 0;
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
      if (event.type === 'message_start') inputTokens = event.message?.usage?.input_tokens ?? 0;
      if (event.type === 'message_delta') outputTokens = event.usage?.output_tokens ?? 0;
    }

    logUsage({ provider: 'anthropic', model: selectedModel, endpoint: 'chat', inputTokens, outputTokens, userId: req.user?.id || null }).catch(() => {});

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
