const Anthropic = require('@anthropic-ai/sdk');
const { query, execute } = require('../db/database');

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Read all memories for a user — used for prompt injection
async function getMemories(userId) {
  if (!userId) return [];
  try {
    const rows = await query(
      `SELECT key, value, confidence, source FROM user_memories
       WHERE user_id = $1 ORDER BY confidence DESC LIMIT 30`,
      [userId]
    );
    return rows;
  } catch {
    return [];
  }
}

// Upsert a single memory fact
async function upsertMemory(userId, key, value, confidence = 0.7, source = 'system') {
  if (!userId) return;
  try {
    await execute(
      `INSERT INTO user_memories (user_id, key, value, confidence, source, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, key) WHERE user_id IS NOT NULL
       DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence,
                     source = EXCLUDED.source, updated_at = NOW()`,
      [userId, key, value, confidence, source]
    );
  } catch (err) {
    console.error('[Memory] upsert error:', err.message);
  }
}

// Format memories as a compact block for prompt injection
function formatMemoriesForPrompt(memories) {
  if (!memories || memories.length === 0) return '';
  const lines = memories.map(m => `  • ${m.key}: ${m.value}`).join('\n');
  return `\nLEARNED ABOUT THIS USER (derived from their history — use to personalize):\n${lines}`;
}

// Extract structured memories from check-in history using Claude Sonnet
async function extractMemories(userId) {
  if (!userId) return;

  try {
    const [checkins, goals, blocks] = await Promise.all([
      query(
        `SELECT date, sleep_hours, exercise, energy_score, nutrition_score,
                focus_score, mood_score, stress_score, learning, productive_hours,
                milestone_hit, purpose_score, alignment_score,
                physical_score, mental_score, financial_score, spiritual_score, overall_score
         FROM checkins WHERE user_id = $1
         ORDER BY date DESC LIMIT 90`,
        [userId]
      ),
      query(
        `SELECT title, domain, current_value, target_value, metric, deadline, priority
         FROM goals WHERE user_id = $1 AND active = 1 LIMIT 10`,
        [userId]
      ),
      query(
        `SELECT pillar, completed_at, skipped_at,
                EXTRACT(HOUR FROM start_time::time) AS hour_of_day
         FROM calendar_blocks
         WHERE user_id = $1 AND date >= (CURRENT_DATE - 60)::text
           AND replaced_at IS NULL
         LIMIT 300`,
        [userId]
      ),
    ]);

    if (checkins.length < 5) return; // not enough data yet

    const checkinSummary = checkins.slice(0, 30).map(c =>
      `${c.date}: sleep=${c.sleep_hours}h exercise=${c.exercise} energy=${c.energy_score} focus=${c.focus_score} mood=${c.mood_score} stress=${c.stress_score} productive=${c.productive_hours}h | P${c.physical_score} M${c.mental_score} F${c.financial_score} S${c.spiritual_score} O${c.overall_score}`
    ).join('\n');

    const completionSummary = (() => {
      const byPillar = {};
      for (const b of blocks) {
        if (!byPillar[b.pillar]) byPillar[b.pillar] = { done: 0, skipped: 0, total: 0 };
        byPillar[b.pillar].total++;
        if (b.completed_at) byPillar[b.pillar].done++;
        if (b.skipped_at) byPillar[b.pillar].skipped++;
      }
      return Object.entries(byPillar).map(([p, v]) =>
        `${p}: ${v.done}/${v.total} completed, ${v.skipped} skipped`
      ).join(' | ');
    })();

    const goalsStr = goals.map(g =>
      `${g.title} [${g.domain}] ${g.current_value}/${g.target_value} ${g.metric}`
    ).join(', ') || 'none';

    const prompt = `You are analyzing a user's personal intelligence data to extract durable, actionable facts about their patterns and behaviours.

RECENT CHECK-INS (last 30 days):
${checkinSummary}

ACTIVE GOALS: ${goalsStr}
BLOCK COMPLETION RATES: ${completionSummary || 'insufficient data'}

Extract 10-20 specific, data-backed memory facts about this user. Each fact should be:
- Specific and quantified where possible (e.g., "sleeps avg 6.2h, correlates with -15 mental score next day")
- Actionable (the AI can use it to personalize planning/advice)
- Non-obvious (not just "has goals" but actual pattern insights)

Categories to cover:
- Sleep/energy patterns and their downstream effects
- Productivity rhythms (when they're most focused)
- Pillar correlations (what drives or drags each pillar)
- Goal progress patterns (what they're close to / behind on)
- Block completion patterns (what they actually do vs. skip)
- Stress and recovery patterns

Return ONLY valid JSON array — no markdown, no commentary:
[
  { "key": "short_snake_case_key", "value": "specific fact with data", "confidence": 0.0-1.0 }
]`;

    const client = getClient();
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (msg.content[0]?.text || '').trim().replace(/```json?/g, '').replace(/```/g, '').trim();
    const facts = JSON.parse(text);

    if (!Array.isArray(facts)) return;

    for (const fact of facts) {
      if (fact.key && fact.value) {
        await upsertMemory(userId, fact.key, fact.value, fact.confidence || 0.7, 'extraction');
      }
    }

    console.log(`[Memory] Extracted ${facts.length} memories for user ${userId}`);
  } catch (err) {
    console.error('[Memory] extractMemories error:', err.message);
  }
}

// Store per-pillar completion rate stats as memories
async function updateCompletionStats(userId) {
  if (!userId) return;
  try {
    const blocks = await query(
      `SELECT pillar,
              COUNT(*) AS total,
              COUNT(completed_at) AS completed,
              COUNT(skipped_at) AS skipped,
              AVG(CASE WHEN completed_at IS NOT NULL THEN 1.0 ELSE 0.0 END) AS rate
       FROM calendar_blocks
       WHERE user_id = $1 AND date >= (CURRENT_DATE - 30)::text AND replaced_at IS NULL
       GROUP BY pillar`,
      [userId]
    );

    for (const row of blocks) {
      const rate = Math.round(parseFloat(row.rate) * 100);
      const total = parseInt(row.total);
      if (total < 3) continue;
      await upsertMemory(
        userId,
        `completion_rate_${row.pillar}`,
        `${rate}% completion on ${row.pillar} blocks (${row.completed}/${total} in last 30 days, ${row.skipped} skipped)`,
        0.9,
        'completion_stats'
      );
    }
  } catch (err) {
    console.error('[Memory] updateCompletionStats error:', err.message);
  }
}

module.exports = { getMemories, upsertMemory, formatMemoriesForPrompt, extractMemories, updateCompletionStats };
