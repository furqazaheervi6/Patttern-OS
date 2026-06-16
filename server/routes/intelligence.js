const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { query, queryOne } = require('../db/database');
const { optionalAuth } = require('../middleware/auth');
const { getMemories, formatMemoriesForPrompt } = require('../services/memoryService');

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

  // Distinct fallback insights so there are no duplicates
  const fallbacks = [
    {
      priority: 'low',
      icon: '✦',
      title: 'Start your intelligence loop',
      body: 'Complete your first daily check-in. PatternOS needs 3+ days of data to surface meaningful patterns and recommendations.',
      action: "Log today's check-in from the Dashboard",
    },
    {
      priority: 'low',
      icon: '◷',
      title: 'Generate your first AI day plan',
      body: 'Go to Calendar → Plan My Day. PatternOS will generate a pillar-balanced schedule around your goals and existing commitments.',
      action: 'Open Calendar → Plan My Day',
    },
    {
      priority: 'low',
      icon: '◈',
      title: 'Set a goal for each pillar',
      body: 'Goals anchor your AI day plans. Without them, plans are generic. Add at least one goal per pillar for maximum precision.',
      action: 'Add goals in Initiatives',
    },
  ];

  let fi = 0;
  while (insights.length < 3) {
    const candidate = fallbacks[fi % fallbacks.length];
    if (!insights.some(i => i.title === candidate.title)) {
      insights.push(candidate);
    }
    fi++;
    if (fi > fallbacks.length * 2) break; // safety
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

    const [scoreRows, initiatives, goals, blockRows, memories] = await Promise.all([
      query(`SELECT date, physical_score, mental_score, financial_score, spiritual_score, overall_score
             FROM checkins WHERE date >= (CURRENT_DATE - 7)::text ${uf} ORDER BY date DESC`, p),
      query(`SELECT name, status, target_date, pillar_emphasis, domain FROM initiatives
             WHERE status = 'active' ${uf} ORDER BY created_at DESC LIMIT 5`, p),
      query(`SELECT title, domain, current_value, target_value, metric FROM goals
             WHERE active = 1 AND completed = 0 ${uf} ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END LIMIT 5`, p),
      query(`SELECT pillar, start_time, end_time FROM calendar_blocks
             WHERE date = $1 AND replaced_at IS NULL${userId ? ' AND (user_id = $2 OR user_id IS NULL)' : ''}`,
             userId ? [today, userId] : [today]).catch(() => []),
      getMemories(userId),
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

      const memoriesStr = formatMemoriesForPrompt(memories);

      const prompt = `You are PatternOS Intelligence — the proactive AI layer of an AI operating system for founders and operators.

TODAY: ${today}
PILLAR SCORES (7-day avg): ${pillarsStr}
ACTIVE INITIATIVES: ${initStr}
ACTIVE GOALS: ${goalsStr}
TODAY'S CALENDAR: ${planStr}${memoriesStr}

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

// Mission cache — 3h TTL (updated by check-in event, not time only)
const missionCache = new Map();
const MISSION_TTL_MS = 3 * 60 * 60 * 1000;

// GET /api/intelligence/mission — daily mission statement
router.get('/mission', optionalAuth, async (req, res) => {
  const userId = req.user?.id || null;
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:${today}`;
  const force = req.query.force === '1';

  if (!force && missionCache.has(key)) {
    const { ts, data } = missionCache.get(key);
    if (Date.now() - ts < MISSION_TTL_MS) return res.json({ ...data, cached: true });
  }

  try {
    const uf = userId ? 'AND (user_id = $1 OR user_id IS NULL)' : 'AND user_id IS NULL';
    const p = userId ? [userId] : [];

    const [checkin, goals, blocks, initiatives] = await Promise.all([
      query(`SELECT physical_score, mental_score, financial_score, spiritual_score, overall_score
             FROM checkins WHERE date = '${today}' ${uf} LIMIT 1`, p).then(r => r[0] || null),
      query(`SELECT title, domain, current_value, target_value, metric, deadline FROM goals
             WHERE active = 1 AND completed = 0 ${uf}
             ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END LIMIT 3`, p),
      query(`SELECT title, pillar, start_time, end_time FROM calendar_blocks
             WHERE date = ? AND replaced_at IS NULL${userId ? ' AND (user_id = ? OR user_id IS NULL)' : ''}
             ORDER BY start_time LIMIT 6`,
             userId ? [today, userId] : [today]).catch(() => []),
      query(`SELECT name, target_date FROM initiatives WHERE status = 'active' ${uf} ORDER BY target_date ASC LIMIT 2`, p),
    ]);

    const scoreStr = checkin
      ? `Physical ${checkin.physical_score} | Mental ${checkin.mental_score} | Financial ${checkin.financial_score} | Spiritual ${checkin.spiritual_score} | Overall ${checkin.overall_score}`
      : 'No check-in yet today';
    const goalsStr = goals.length
      ? goals.map(g => `"${g.title}" (${g.current_value}/${g.target_value} ${g.metric}${g.deadline ? `, due ${g.deadline}` : ''})`).join('; ')
      : 'none set';
    const blocksStr = blocks.length
      ? blocks.map(b => `${b.start_time}–${b.end_time} ${b.title}`).join(', ')
      : 'no plan generated yet';
    const initStr = initiatives.length
      ? initiatives.map(i => `"${i.name}"${i.target_date ? ` (due ${i.target_date})` : ''}`).join(', ')
      : '';

    const prompt = `You are PatternOS — the AI operating system for a high-agency founder.

TODAY: ${today}
PILLAR SCORES: ${scoreStr}
TOP GOALS: ${goalsStr}
TODAY'S PLAN: ${blocksStr}${initStr ? `\nACTIVE INITIATIVES: ${initStr}` : ''}

Write a single DAILY MISSION STATEMENT for this person. Rules:
- 1-2 sentences maximum
- Start with "Today:" or lead with the top priority action
- Reference one specific goal, score, or initiative by name
- Sound like a sharp chief-of-staff giving a battle order — not a coach
- No generic advice ("focus on what matters") — name the actual thing
- End with the expected outcome

Return ONLY the mission statement text, no quotes, no explanation.`;

    try {
      const client = getClient();
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = (msg.content[0]?.text || '').trim();
      if (text) {
        const payload = { mission: text, date: today };
        missionCache.set(key, { ts: Date.now(), data: payload });
        return res.json({ ...payload, cached: false });
      }
    } catch {}

    // Fallback when Claude is unavailable
    const fallback = goals.length
      ? `Today: advance "${goals[0].title}" — you're at ${goals[0].current_value}/${goals[0].target_value} ${goals[0].metric}. Focus blocks on closing the gap.`
      : 'Today: complete your morning check-in and generate your AI day plan — the intelligence loop starts with data.';

    const payload = { mission: fallback, date: today };
    missionCache.set(key, { ts: Date.now(), data: payload });
    res.json({ ...payload, cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/intelligence/research — latest research briefs for user's active initiatives
router.get('/research', optionalAuth, async (req, res) => {
  const userId = req.user?.id || null;
  if (!userId) return res.json({ research: [] });

  try {
    const rows = await query(
      `SELECT ir.id, ir.initiative_name, ir.summary, ir.key_tactics, ir.created_at
       FROM initiative_research ir
       INNER JOIN (
         SELECT initiative_name, MAX(created_at) AS latest
         FROM initiative_research
         WHERE user_id = $1
         GROUP BY initiative_name
       ) latest ON ir.initiative_name = latest.initiative_name AND ir.created_at = latest.latest
       WHERE ir.user_id = $1
       ORDER BY ir.created_at DESC LIMIT 5`,
      [userId]
    );

    const research = rows.map(r => ({
      ...r,
      key_tactics: typeof r.key_tactics === 'string' ? JSON.parse(r.key_tactics || '[]') : (r.key_tactics || []),
    }));

    res.json({ research });
  } catch (err) {
    res.status(500).json({ error: err.message, research: [] });
  }
});

// POST /api/intelligence/research/trigger — manually trigger research for current user
router.post('/research/trigger', optionalAuth, async (req, res) => {
  const userId = req.user?.id || null;
  if (!userId) return res.status(401).json({ error: 'Auth required' });

  try {
    const { researchUserInitiatives } = require('../services/researchAgent');
    researchUserInitiatives(userId).catch(() => {});
    res.json({ message: 'Research triggered — results will appear in your feed shortly.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/intelligence/memories/extract — manually trigger memory extraction
router.post('/memories/extract', optionalAuth, async (req, res) => {
  const userId = req.user?.id || null;
  if (!userId) return res.status(401).json({ error: 'Auth required' });

  try {
    const { extractMemories } = require('../services/memoryService');
    extractMemories(userId).catch(() => {});
    res.json({ message: 'Memory extraction triggered — your AI will be more personalized shortly.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/intelligence/memories — read current memories for the user
router.get('/memories', optionalAuth, async (req, res) => {
  const userId = req.user?.id || null;
  if (!userId) return res.json({ memories: [] });

  try {
    const { getMemories } = require('../services/memoryService');
    const memories = await getMemories(userId);
    res.json({ memories });
  } catch (err) {
    res.status(500).json({ error: err.message, memories: [] });
  }
});

module.exports = router;
