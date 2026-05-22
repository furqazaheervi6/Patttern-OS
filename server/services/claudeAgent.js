const Anthropic = require('@anthropic-ai/sdk');
const { query, execute } = require('../db/database');

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toISOString().split('T')[0];
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

function computeAverages(checkins) {
  if (!checkins.length) return { physical: 0, mental: 0, financial: 0, spiritual: 0 };
  const sum = checkins.reduce(
    (acc, c) => ({
      physical: acc.physical + (c.physical_score || 0),
      mental: acc.mental + (c.mental_score || 0),
      financial: acc.financial + (c.financial_score || 0),
      spiritual: acc.spiritual + (c.spiritual_score || 0),
    }),
    { physical: 0, mental: 0, financial: 0, spiritual: 0 }
  );
  const n = checkins.length;
  return {
    physical: sum.physical / n,
    mental: sum.mental / n,
    financial: sum.financial / n,
    spiritual: sum.spiritual / n,
  };
}

async function generateWeeklyDigest() {
  const checkins = await query(
    `SELECT * FROM checkins WHERE date >= (CURRENT_DATE - 7)::text ORDER BY date ASC`
  );

  const trendData = await query(
    `SELECT date, physical_score, mental_score, financial_score, spiritual_score, overall_score FROM checkins WHERE date >= (CURRENT_DATE - 30)::text ORDER BY date ASC`
  );

  if (checkins.length === 0) {
    return {
      content: '## No data available\n\nComplete some daily check-ins first to generate a weekly digest.',
      weakest: null,
      strongest: null,
    };
  }

  const client = getClient();

  const prompt = `You are PatternOS — a personal intelligence agent tracking four pillars of health for a solo AI founder.

The four pillars are:
- Physical (Body): energy, sleep, exercise, nutrition
- Mental (Mind): focus, mood, stress, learning
- Financial (World): productive hours, milestones, revenue progress
- Spiritual (Soul): reflection, purpose, gratitude, alignment

Here is the user's data for the past 7 days:
${JSON.stringify(checkins, null, 2)}

And here is their 30-day trend (scores 0-100 per pillar):
${JSON.stringify(trendData, null, 2)}

Generate a weekly digest with these exact sections:

## This Week's Overview
[2-3 sentence summary of the week across all four pillars]

## Strongest Pillar: [Pillar Name]
[Why this pillar performed well — specific data references]

## Needs Attention: [Pillar Name]
[What's dragging and why — specific data references]

## Cross-Pillar Patterns Detected
[List 2-4 patterns showing how pillars are affecting each other. Be specific and data-driven.]

## Trend Analysis (30-Day)
[What is improving, what is declining, what is staying flat]

## One Recommendation for Next Week
[Single, specific, actionable recommendation based on the data — not generic advice]

Be honest, specific, and data-driven. Reference actual numbers. Avoid generic wellness platitudes.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0].text;
  const avgScores = computeAverages(checkins);
  const sorted = Object.entries(avgScores).sort((a, b) => a[1] - b[1]);
  const weakest = sorted[0][0];
  const strongest = sorted[sorted.length - 1][0];

  const { weekStart, weekEnd } = getWeekBounds();

  await execute(
    `INSERT INTO digests (week_start, week_end, content, weakest_pillar, strongest_pillar)
     VALUES (?,?,?,?,?)
     ON CONFLICT (week_start, week_end) DO UPDATE SET
       content = EXCLUDED.content, weakest_pillar = EXCLUDED.weakest_pillar, strongest_pillar = EXCLUDED.strongest_pillar`,
    [weekStart, weekEnd, content, weakest, strongest]
  );

  return { content, weakest, strongest };
}

async function detectPatternAlerts(latestCheckin, recentCheckins) {
  if (!latestCheckin || !process.env.ANTHROPIC_API_KEY) return { alert: false };

  const client = getClient();

  const prompt = `You are a pattern detection agent. Analyze this person's latest check-in vs their recent history.

Latest check-in (today):
${JSON.stringify(latestCheckin, null, 2)}

Recent 7 days:
${JSON.stringify(recentCheckins, null, 2)}

Pillar scores are 0-100. Identify any cross-pillar pattern worth surfacing RIGHT NOW.
Only flag something if there's a real signal — not every check-in needs an alert.

Respond ONLY with valid JSON (no markdown, no code blocks):
{"alert":true,"pillar_a":"physical","pillar_b":"mental","description":"one-sentence pattern","severity":"info"}

or if no alert: {"alert":false}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const text = response.content[0].text.trim().replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return { alert: false };
  }
}

async function extractPillarSignalsFromNotion(pageContent, pageDate) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = getClient();

  const prompt = `You are reading a personal journal entry. Extract any signals related to these four health pillars.

Journal content:
${JSON.stringify(pageContent, null, 2)}

Date: ${pageDate}

Respond ONLY with valid JSON (no markdown, no code blocks):
{"physical":{"energy_score":null,"exercise":null,"sleep_hours":null,"notes":""},"mental":{"mood_score":null,"focus_score":null,"stress_score":null,"notes":""},"financial":{"productive_hours":null,"milestone_hit":null,"revenue_note":"","notes":""},"spiritual":{"reflection_done":null,"purpose_score":null,"alignment_score":null,"notes":""}}

Use null for any field not mentioned. Scores are 1-10. Booleans are true/false.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const text = response.content[0].text.trim().replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

module.exports = { generateWeeklyDigest, detectPatternAlerts, extractPillarSignalsFromNotion };
