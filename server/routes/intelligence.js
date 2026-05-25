const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { query, queryOne } = require('../db/database');
const { optionalAuth } = require('../middleware/auth');

// In-memory cache: key = `${userId}:${date}`, TTL 6h
const cache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function minutesToHours(min) {
  return Math.round((min / 60) * 10) / 10;
}

// Rule-based fallback insights when Claude is unavailable
function buildFallbackInsights(ctx) {
  const insights = [];
  const { pillarAvg, initiatives, hasBlocksToday, goals } = ctx;

  const weakest = Object.entries(pillarAvg).sort(([, a], [, b]) => a - b)[0];
  if (weakest && weakest[1] < 60) {
    insights.push({
      priority: 'high',
      icon: '⚡',
      title: `${weakest[0].charAt(0).toUpperCase() + weakest[0].slice(1)} score is low`,
      body: `Your ${weakest[0]} pillar averages ${weakest[1]}/100 this week — below the healthy threshold of 60.`,
      action: `Add a ${weakest[0]} recovery block to tomorrow's plan`,
    });
  }

  if (!hasBlocksToday) {
    insights.push({
      priority: 'high',
      icon: '◷',
      title: "Today's plan is empty",
      body: "You don't have any calendar blocks for today. PatternOS works best when your day is structured.",
      action: 'Go to Calendar → Plan My Day',
    });
  }

  const behindInitiative = initiatives.find(i => i.status === 'active' && i.target_date && new Date(i.target_date) < new Date(Date.now() + 14 * 86400000));
  if (behindInitiative) {
    insights.push({
      priority: 'medium',
      icon: '◈',
      title: 'Initiative deadline approaching',
      body: `"${behindInitiative.name}" is due ${behindInitiative.target_date}. Make sure milestones are on track.`,
      action: 'Review milestones in Initiatives',
    });
  }

  if (goals.length === 0) {
    insights.push({
      priority: 'low',
      icon: '◎',
      title: 'No active goals set',
      body: 'PatternOS builds your day plans around your goals. Without goals, plans are generic.',
      action: 'Set your first goal from the Dashboard',
    });
  }

  while (insights.length < 3) {
    insights.push({
      priority: 'low',
      icon: '✦',
      title: 'Keep the streak going',
      body: 'Consistent daily check-ins unlock pattern detection — the longer the streak, the smarter your insights.',
      action: 'Complete today\'s check-in',
    });
  }

  return insights.slice(0, 3);
}

// GET /api/intelligence/feed
router.get('/feed', optionalAuth, async (req, res) => {
  const userId = req.user?.id || null;
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `${userId}:${today}`;
  const force = req.query.force === '1';

  // Return cached if fresh
  if (!force && cache.has(cacheKey)) {
    const { ts, data } = cache.get(cacheKey);
    if (Date.now() - ts < CACHE_TTL_MS) return res.json({ insights: data, cached: true });
  }

  try {
    const uf = userId ? 'AND (user_id = $1 OR user_id IS NULL)' : 'AND user_id IS NULL';
    const p = userId ? [userId] : [];

    const [scoreRows, initiatives, goals, blockRows] = await Promise.all([
      query(`SELECT date, physical_score, mental_score, financial_score, spiritual_score, overall_score
             FROM checkins WHERE date >= (CURRENT_DATE - 7)::text ${uf} ORDER BY date DESC`, p),
      query(`SELECT name, status, target_date, pillar_emphasis, domain FROM initiatives
             WHERE status = 'active' ${uf} ORDER BY created_at DESC LIMIT 5`, p),
      query(`SELECT title, domain, current_value, target_value, metric FROM goals
             WHERE active = 1 AND completed = 0 ${uf} ORDER BY priority DESC LIMIT 5`, p),
      query(`SELECT pillar, start_time, end_time FROM calendar_blocks
             WHERE date = $1 AND replaced_at IS NULL${userId ? ' AND (user_id = $2 OR user_id IS NULL)' : ''}`,
             userId ? [today, userId] : [today]).catch(() => []),
    ]);

    // Compute 7-day avg per pillar
    const pillarAvg = { physical: 0, mental: 0, financial: 0, spiritual: 0 };
    if (scoreRows.length > 0) {
      for (const p of Object.keys(pillarAvg)) {
        const vals = scoreRows.map(r => parseFloat(r[`${p}_score`])).filter(v => !isNaN(v));
        pillarAvg[p] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      }
    }

    const ctx = { pillarAvg, initiatives, goals, hasBlocksToday: blockRows.length > 0 };

    // Try Claude for richer insights
    try {
      const pillarsStr = Object.entries(pillarAvg).map(([k, v]) => `${k}: ${v}/100`).join(' | ');
      const initStr = initiatives.map(i => `"${i.name}" (${i.pillar_emphasis || i.domain || 'general'}, due ${i.target_date || 'open'})`).join(', ') || 'none';
      const goalsStr = goals.map(g => `${g.title} [${g.domain}]: ${g.current_value}/${g.target_value} ${g.metric}`).join(', ') || 'none set';
      const planStr = blockRows.length > 0 ? `${blockRows.length} blocks planned` : 'no plan generated yet';

      const prompt = `You are PatternOS Intelligence — the proactive AI layer of an AI operating system for founders and operators.

TODAY: ${today}
PILLAR SCORES (7-day avg): ${pillarsStr}
ACTIVE INITIATIVES: ${initStr}
ACTIVE GOALS: ${goalsStr}
TODAY'S CALENDAR: ${planStr}

Generate EXACTLY 3 proactive intelligence insights. Each should:
1. Reference a specific number or pattern from the context above
2. Recommend a concrete next action
3. Sound like a sharp chief-of-staff, not a wellness coach
4. Be specific — no generic advice

Return ONLY valid JSON array, no markdown, no commentary:
[
  {
    "priority": "high",
    "icon": "single emoji",
    "title": "headline 5-8 words",
    "body": "1-2 specific sentences with data",
    "action": "one concrete next step"
  }
]`;

      const client = getClient();
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = (msg.content[0]?.text || '').trim().replace(/```json?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cache.set(cacheKey, { ts: Date.now(), data: parsed });
        return res.json({ insights: parsed, cached: false });
      }
    } catch {}

    // Fallback to rule-based
    const fallback = buildFallbackInsights(ctx);
    cache.set(cacheKey, { ts: Date.now(), data: fallback });
    res.json({ insights: fallback, cached: false });

  } catch (err) {
    res.status(500).json({ error: err.message, insights: [] });
  }
});

module.exports = router;
