const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../db/database');
const { upsertMemory } = require('./memoryService');

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Run deep pattern analysis across 90 days of check-in data for a user.
// Discovers multi-variable correlations and stores them as user_memories.
async function analyzePatterns(userId) {
  if (!userId) return;

  try {
    const checkins = await query(
      `SELECT date, sleep_hours, exercise, energy_score, nutrition_score,
              focus_score, mood_score, stress_score, learning, productive_hours,
              milestone_hit, purpose_score, alignment_score,
              physical_score, mental_score, financial_score, spiritual_score, overall_score
       FROM checkins WHERE user_id = $1
       ORDER BY date ASC LIMIT 90`,
      [userId]
    );

    if (checkins.length < 10) {
      console.log(`[Patterns] Not enough data for user ${userId} (${checkins.length} check-ins)`);
      return;
    }

    // Build a compact CSV-style dump for Claude to analyze
    const header = 'date,sleep_h,exercise,energy,nutrition,focus,mood,stress,productive_h,purpose,alignment,physical,mental,financial,spiritual,overall';
    const rows = checkins.map(c =>
      [
        c.date,
        c.sleep_hours ?? '',
        c.exercise ?? '',
        c.energy_score ?? '',
        c.nutrition_score ?? '',
        c.focus_score ?? '',
        c.mood_score ?? '',
        c.stress_score ?? '',
        c.productive_hours ?? '',
        c.purpose_score ?? '',
        c.alignment_score ?? '',
        c.physical_score ?? '',
        c.mental_score ?? '',
        c.financial_score ?? '',
        c.spiritual_score ?? '',
        c.overall_score ?? '',
      ].join(',')
    );

    const csvData = [header, ...rows].join('\n');

    const prompt = `You are a data analyst examining a founder's personal performance data to uncover hidden patterns.

DATA (${checkins.length} days of daily check-ins):
${csvData}

Analyze this data to find:
1. Sleep correlations — how does sleep_hours affect scores the SAME day and the NEXT day?
2. Exercise effect — does exercise correlate with higher mental/physical scores?
3. Stress cascade — does high stress (>7) predict lower scores in following days?
4. Productive hours drivers — what inputs (sleep, exercise, low stress) predict more productive hours?
5. Pillar interdependencies — which pillars tend to move together or inversely?
6. Recovery patterns — after a low overall score day, how quickly do scores typically recover?
7. Peak performance profile — what combination of inputs produces the highest overall scores?

For each pattern you find, state it as a specific, quantified fact.

Return ONLY valid JSON array — no markdown:
[
  {
    "key": "pattern_sleep_mental",
    "value": "Mental score is X points higher on days with 7.5+ hours sleep (based on N observations)",
    "confidence": 0.85
  }
]

Return 8-15 patterns. Only include patterns with at least 3 data points supporting them.`;

    const client = getClient();
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (msg.content[0]?.text || '').trim().replace(/```json?/g, '').replace(/```/g, '').trim();
    const patterns = JSON.parse(text);

    if (!Array.isArray(patterns)) return;

    for (const p of patterns) {
      if (p.key && p.value) {
        await upsertMemory(userId, p.key, p.value, p.confidence || 0.75, 'pattern_analysis');
      }
    }

    console.log(`[Patterns] Analyzed ${checkins.length} check-ins, stored ${patterns.length} patterns for user ${userId}`);
  } catch (err) {
    console.error('[Patterns] analyzePatterns error:', err.message);
  }
}

// Run for all users who have enough check-in data
async function analyzeAllUsers() {
  try {
    const users = await query(
      `SELECT DISTINCT user_id FROM checkins
       WHERE user_id IS NOT NULL
       GROUP BY user_id HAVING COUNT(*) >= 10`
    );
    for (const { user_id } of users) {
      await analyzePatterns(user_id);
    }
    console.log(`[Patterns] Completed analysis for ${users.length} users`);
  } catch (err) {
    console.error('[Patterns] analyzeAllUsers error:', err.message);
  }
}

module.exports = { analyzePatterns, analyzeAllUsers };
