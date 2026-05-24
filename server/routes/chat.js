const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { query, queryOne } = require('../db/database');

const ALLOWED_MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
};

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function buildContext() {
  try {
    const [today, recent, goals, notionFeed, activities] = await Promise.all([
      queryOne("SELECT * FROM checkins ORDER BY date DESC LIMIT 1"),
      query("SELECT date, physical_score, mental_score, financial_score, spiritual_score, overall_score FROM checkins ORDER BY date DESC LIMIT 14"),
      query("SELECT title, domain, metric, target_value, current_value, deadline FROM goals WHERE active = 1 AND completed = 0 ORDER BY priority DESC LIMIT 10"),
      query("SELECT page_date, raw_content, parsed_fields FROM notion_cache ORDER BY page_date DESC NULLS LAST LIMIT 7"),
      query("SELECT a.name, a.domain, a.impact FROM daily_activities da JOIN activities a ON a.id = da.activity_id WHERE da.date = (SELECT MAX(date) FROM daily_activities) LIMIT 10"),
    ]);

    const notionEntries = notionFeed.map(p => {
      const raw = typeof p.raw_content === 'string' ? JSON.parse(p.raw_content || '{}') : (p.raw_content || {});
      let pf = null;
      try { pf = p.parsed_fields ? JSON.parse(p.parsed_fields) : null; } catch {}

      const pillarNotes = pf
        ? Object.entries(pf)
            .filter(([, v]) => v?.notes)
            .map(([k, v]) => `  ${k}: ${v.notes}`)
            .join('\n')
        : null;

      return {
        date: p.page_date,
        title: raw.title || 'Untitled',
        full_text: raw.full_text ? raw.full_text.slice(0, 800) : null,
        pillar_notes: pillarNotes,
        summary: pf?.summary || null,
      };
    });

    return { today, recent, goals, notionEntries, activities };
  } catch {
    return { today: null, recent: [], goals: [], notionEntries: [], activities: [] };
  }
}

function buildSystemPrompt(ctx, calendarPlan = null, currentDate = null) {
  const { today, recent, goals, notionEntries, activities } = ctx;

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

  // Build calendar plan context
  let calendarBlock = '';
  if (calendarPlan) {
    const dateKeys = Object.keys(calendarPlan).sort();
    const focusDate = currentDate || dateKeys[0];
    const blocks = calendarPlan[focusDate] || [];
    if (blocks.length > 0) {
      calendarBlock = `\nCURRENT DAY PLAN (${focusDate}):\n` +
        blocks.map(b => `  ${b.start}–${b.end} [${b.pillar}] ${b.title}`).join('\n');
    }
  }

  return `You are PatternOS Intelligence — a sharp, data-driven personal coach inside PatternOS.

RESPONSE RULES (follow strictly):
→ 2-4 sentences max unless the user asks for detail or analysis
→ Lead with the insight or answer — no preamble, no restating the question
→ No markdown headers (##, ###). No bullet lists unless the user asks for a breakdown
→ Reference actual numbers from user data when relevant
→ If no check-in today, say so in one line and move on

PILLARS: Physical (sleep/exercise/energy) · Mental (focus/mood/stress) · Financial (productive hours/milestones) · Spiritual (reflection/purpose/gratitude)

CALENDAR EDITING CAPABILITY:
When the user asks to modify their day plan (add/remove/move/change a block, swap times, reschedule something), respond naturally AND append a structured block at the very end of your response on a new line:
<CALENDAR_ACTIONS>[{"action":"add","date":"YYYY-MM-DD","start":"HH:MM","end":"HH:MM","title":"...","pillar":"physical|mental|financial|spiritual|personal","description":"...","priority":"high|medium|low"},{"action":"remove","date":"YYYY-MM-DD","start":"HH:MM"},{"action":"update","date":"YYYY-MM-DD","start":"HH:MM","newStart":"HH:MM","newEnd":"HH:MM","title":"..."}]</CALENDAR_ACTIONS>
Valid actions: "add" (new block), "remove" (by date+start), "update" (by date+start, change fields).
Only include <CALENDAR_ACTIONS> when you are actually making schedule changes. Never for informational responses.
The pillar must be exactly one of: physical, mental, financial, spiritual, personal.

━━━ USER DATA ━━━
${scoreBlock}
${trendBlock}
GOALS: ${goalsBlock}
NOTION: ${notionBlock}
ACTIVITIES: ${activityBlock}${calendarBlock}
━━━━━━━━━━━━━━━`;
}

// Normalise messages: ensure content blocks are valid for the Anthropic API.
// Frontend sends attachments as { type, mediaType, data } inside content arrays.
function normaliseMessages(messages) {
  return messages.slice(-20).map(msg => {
    if (typeof msg.content === 'string') return msg;

    const blocks = msg.content.map(block => {
      if (block.type === 'text') return block;

      if (block.type === 'image') {
        return {
          type: 'image',
          source: { type: 'base64', media_type: block.mediaType, data: block.data },
        };
      }

      if (block.type === 'document') {
        return {
          type: 'document',
          source: { type: 'base64', media_type: block.mediaType, data: block.data },
        };
      }

      return block;
    });

    return { role: msg.role, content: blocks };
  });
}

// POST /api/chat — streaming, multimodal, model-selectable
router.post('/', async (req, res) => {
  const { messages, model = 'haiku', calendarPlan = null, currentDate = null } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const selectedModel = ALLOWED_MODELS[model] || ALLOWED_MODELS.haiku;
  const maxTokens = model === 'sonnet' ? 1500 : 600;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const ctx = await buildContext();
    const systemPrompt = buildSystemPrompt(ctx, calendarPlan, currentDate);
    const client = getClient();

    const normalisedMessages = normaliseMessages(messages);

    const stream = client.messages.stream({
      model: selectedModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: normalisedMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
