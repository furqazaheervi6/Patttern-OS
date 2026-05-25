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
    model: 'claude-sonnet-4-6',
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
    model: 'claude-sonnet-4-6',
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
    model: 'claude-sonnet-4-6',
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

// Extract pillar signals from full journal text AND upsert a check-in for that date
async function extractAndApplyPillarSignals(fullText, pageDate) {
  if (!process.env.ANTHROPIC_API_KEY || !fullText || !pageDate) return null;

  const client = getClient();

  const prompt = `You are PatternOS — reading a personal journal/notes page and extracting health signals.

Journal text:
${fullText.slice(0, 4000)}

Date of this entry: ${pageDate}

Extract ALL signals you can find. Map them to these exact check-in fields:

PHYSICAL: sleep_hours (number 0-12), energy_score (1-10), nutrition_score (1-10), exercise (boolean — true if any physical activity mentioned)

MENTAL: focus_score (1-10), mood_score (1-10), stress_score (1-10, where 10 = very stressed), learning (boolean — true if any learning/studying mentioned)

FINANCIAL: productive_hours (number 0-16), milestone_hit (boolean — true if goal/milestone achieved), revenue_note (string, brief)

SPIRITUAL: reflection_done (boolean — true if any reflection/journaling/gratitude mentioned), purpose_score (1-10), alignment_score (1-10), gratitude_done (boolean — true if gratitude mentioned)

Also extract human-readable notes per pillar summarizing what the journal says about each.

Respond ONLY with valid JSON (no markdown):
{
  "checkin": {
    "sleep_hours": null,
    "energy_score": null,
    "nutrition_score": null,
    "exercise": null,
    "focus_score": null,
    "mood_score": null,
    "stress_score": null,
    "learning": null,
    "productive_hours": null,
    "milestone_hit": null,
    "revenue_note": null,
    "reflection_done": null,
    "purpose_score": null,
    "alignment_score": null,
    "gratitude_done": null
  },
  "signals": {
    "physical": { "notes": "" },
    "mental": { "notes": "" },
    "financial": { "notes": "" },
    "spiritual": { "notes": "" }
  },
  "summary": "one-sentence summary of the whole entry"
}

Use null for fields not mentioned. At minimum, infer booleans from context (e.g. if they mention going for a run, exercise = true).`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  let parsed;
  try {
    const text = response.content[0].text.trim().replace(/```json\n?|\n?```/g, '').trim();
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  // Upsert a check-in for this date using the extracted data
  if (parsed?.checkin && pageDate) {
    try {
      const { computeAllScores } = require('../utils/pillarScorer');
      const data = parsed.checkin;
      const scores = computeAllScores(data);

      // Only write fields that Claude actually found (not null)
      // Use COALESCE so we don't overwrite manual check-ins with nulls
      const hasAnyData = Object.values(data).some(v => v !== null && v !== undefined);
      if (hasAnyData) {
        await execute(
          `INSERT INTO checkins (
            date, sleep_hours, exercise, energy_score, nutrition_score,
            focus_score, mood_score, stress_score, learning,
            productive_hours, milestone_hit, revenue_note,
            reflection_done, purpose_score, gratitude_done, alignment_score,
            physical_score, mental_score, financial_score, spiritual_score, overall_score,
            updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
          ON CONFLICT(date) DO UPDATE SET
            sleep_hours    = COALESCE(EXCLUDED.sleep_hours, checkins.sleep_hours),
            exercise       = COALESCE(EXCLUDED.exercise, checkins.exercise),
            energy_score   = COALESCE(EXCLUDED.energy_score, checkins.energy_score),
            nutrition_score= COALESCE(EXCLUDED.nutrition_score, checkins.nutrition_score),
            focus_score    = COALESCE(EXCLUDED.focus_score, checkins.focus_score),
            mood_score     = COALESCE(EXCLUDED.mood_score, checkins.mood_score),
            stress_score   = COALESCE(EXCLUDED.stress_score, checkins.stress_score),
            learning       = COALESCE(EXCLUDED.learning, checkins.learning),
            productive_hours = COALESCE(EXCLUDED.productive_hours, checkins.productive_hours),
            milestone_hit  = COALESCE(EXCLUDED.milestone_hit, checkins.milestone_hit),
            revenue_note   = COALESCE(EXCLUDED.revenue_note, checkins.revenue_note),
            reflection_done= COALESCE(EXCLUDED.reflection_done, checkins.reflection_done),
            purpose_score  = COALESCE(EXCLUDED.purpose_score, checkins.purpose_score),
            gratitude_done = COALESCE(EXCLUDED.gratitude_done, checkins.gratitude_done),
            alignment_score= COALESCE(EXCLUDED.alignment_score, checkins.alignment_score),
            physical_score = GREATEST(COALESCE(EXCLUDED.physical_score, 0), COALESCE(checkins.physical_score, 0)),
            mental_score   = GREATEST(COALESCE(EXCLUDED.mental_score, 0), COALESCE(checkins.mental_score, 0)),
            financial_score= GREATEST(COALESCE(EXCLUDED.financial_score, 0), COALESCE(checkins.financial_score, 0)),
            spiritual_score= GREATEST(COALESCE(EXCLUDED.spiritual_score, 0), COALESCE(checkins.spiritual_score, 0)),
            overall_score  = GREATEST(COALESCE(EXCLUDED.overall_score, 0), COALESCE(checkins.overall_score, 0)),
            updated_at     = EXCLUDED.updated_at`,
          [
            pageDate,
            data.sleep_hours ?? null,
            data.exercise != null ? (data.exercise ? 1 : 0) : null,
            data.energy_score ?? null,
            data.nutrition_score ?? null,
            data.focus_score ?? null,
            data.mood_score ?? null,
            data.stress_score ?? null,
            data.learning != null ? (data.learning ? 1 : 0) : null,
            data.productive_hours ?? null,
            data.milestone_hit != null ? (data.milestone_hit ? 1 : 0) : null,
            data.revenue_note ?? null,
            data.reflection_done != null ? (data.reflection_done ? 1 : 0) : null,
            data.purpose_score ?? null,
            data.gratitude_done != null ? (data.gratitude_done ? 1 : 0) : null,
            data.alignment_score ?? null,
            scores.physical_score,
            scores.mental_score,
            scores.financial_score,
            scores.spiritual_score,
            scores.overall_score,
            new Date().toISOString(),
          ]
        );
        console.log(`[Notion→Checkin] Applied signals for ${pageDate}`);
      }
    } catch (err) {
      console.error(`[Notion→Checkin] Failed to write checkin for ${pageDate}:`, err.message);
    }
  }

  return { signals: parsed.signals, summary: parsed.summary, checkin: parsed.checkin };
}

module.exports = {
  generateWeeklyDigest,
  detectPatternAlerts,
  extractPillarSignalsFromNotion,
  extractAndApplyPillarSignals,
};
