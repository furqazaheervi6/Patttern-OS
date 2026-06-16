const Anthropic = require('@anthropic-ai/sdk');
const { query, execute } = require('../db/database');

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Generate a research brief for a single initiative using Claude's knowledge
async function researchInitiative(userId, initiative) {
  const { id: initiativeId, name, pillar_emphasis, domain, target_date } = initiative;

  const prompt = `You are a world-class strategic advisor and research analyst.

A founder is working on an initiative called: "${name}"
Domain: ${pillar_emphasis || domain || 'general'}
${target_date ? `Target completion: ${target_date}` : ''}

Generate a focused research brief that would give this person a competitive edge. Include:
1. The 3 most effective proven tactics/frameworks for achieving this type of goal
2. The #1 mistake people make when pursuing this — and how to avoid it
3. A specific benchmark or metric they should be tracking that most people overlook
4. One unconventional insight that high performers in this area know

Write as a sharp, direct chief-of-staff, not a consultant. Be specific and actionable.

Return ONLY valid JSON — no markdown:
{
  "summary": "2-3 sentence research summary",
  "key_tactics": [
    "Tactic 1 — specific and actionable",
    "Tactic 2 — specific and actionable",
    "Tactic 3 — specific and actionable"
  ],
  "top_mistake": "The #1 mistake and how to avoid it",
  "hidden_metric": "Overlooked metric they should track",
  "unconventional_insight": "One high-performer insight"
}`;

  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (msg.content[0]?.text || '').trim().replace(/```json?/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(text);

    if (!result.summary) return null;

    const keyTactics = [
      result.key_tactics?.[0],
      result.key_tactics?.[1],
      result.key_tactics?.[2],
      result.top_mistake ? `Avoid: ${result.top_mistake}` : null,
      result.hidden_metric ? `Track: ${result.hidden_metric}` : null,
      result.unconventional_insight ? `Edge: ${result.unconventional_insight}` : null,
    ].filter(Boolean);

    await execute(
      `INSERT INTO initiative_research (user_id, initiative_id, initiative_name, query, summary, key_tactics, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, initiativeId || null, name, `Research brief for: ${name}`, result.summary, JSON.stringify(keyTactics)]
    );

    console.log(`[Research] Brief generated for "${name}" (user ${userId})`);
    return result;
  } catch (err) {
    console.error(`[Research] researchInitiative error for "${name}":`, err.message);
    return null;
  }
}

// Research all active initiatives for a user
async function researchUserInitiatives(userId) {
  if (!userId) return;
  try {
    const initiatives = await query(
      `SELECT id, name, pillar_emphasis, domain, target_date FROM initiatives
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    if (initiatives.length === 0) return;

    // Only re-research initiatives that haven't been researched in the last 7 days
    const recentResearch = await query(
      `SELECT DISTINCT initiative_id FROM initiative_research
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    );
    const recentIds = new Set(recentResearch.map(r => String(r.initiative_id)));

    const toResearch = initiatives.filter(i => !recentIds.has(String(i.id)));

    for (const initiative of toResearch) {
      await researchInitiative(userId, initiative);
    }

    console.log(`[Research] Researched ${toResearch.length}/${initiatives.length} initiatives for user ${userId}`);
  } catch (err) {
    console.error('[Research] researchUserInitiatives error:', err.message);
  }
}

// Run research for all users with active initiatives
async function researchAllUsers() {
  try {
    const users = await query(
      `SELECT DISTINCT user_id FROM initiatives WHERE status = 'active' AND user_id IS NOT NULL`
    );
    for (const { user_id } of users) {
      await researchUserInitiatives(user_id);
    }
    console.log(`[Research] Completed research run for ${users.length} users`);
  } catch (err) {
    console.error('[Research] researchAllUsers error:', err.message);
  }
}

module.exports = { researchInitiative, researchUserInitiatives, researchAllUsers };
