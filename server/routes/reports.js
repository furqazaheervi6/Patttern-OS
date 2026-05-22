const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db/database');

const EVOLUTION_CATEGORIES = [
  { id: 'physical', label: 'Physical', icon: '🏋️', evolution: 'construction' },
  { id: 'mental', label: 'Mental', icon: '🧠', evolution: 'kaizen' },
  { id: 'financial', label: 'Financial', icon: '💰', evolution: '200' },
  { id: 'spiritual', label: 'Spiritual', icon: '🕊️', evolution: 'harmony' },
  { id: 'social', label: 'Social', icon: '🤝', evolution: 'humanity' },
  { id: 'purpose', label: 'Purpose', icon: '🧭', evolution: 'sojourney' },
  { id: 'awareness', label: 'Awareness', icon: '👁️', evolution: 'omnivision' },
];

// GET /api/reports — list reports by date range
router.get('/', async (req, res) => {
  try {
    const { date, category, days } = req.query;
    let sql = 'SELECT * FROM daily_reports';
    const params = [];
    const conditions = [];

    if (date) {
      conditions.push('date = ?');
      params.push(date);
    } else if (days) {
      const d = parseInt(days);
      conditions.push(`date >= (CURRENT_DATE - ${d})::text`);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY date DESC, category ASC';

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/categories — return available evolution categories
router.get('/categories', (req, res) => {
  res.json(EVOLUTION_CATEGORIES);
});

// POST /api/reports/generate — generate daily reports for a given date
router.post('/generate', async (req, res) => {
  try {
    const { date, categories } = req.body;
    const reportDate = date || new Date().toISOString().split('T')[0];
    const targetCategories = categories || EVOLUTION_CATEGORIES.map(c => c.id);

    // Gather context data
    const checkin = await queryOne('SELECT * FROM checkins WHERE date = ?', [reportDate]);
    const activities = await query(`
      SELECT da.*, a.name, a.domain, a.impact, a.weight, a.icon
      FROM daily_activities da JOIN activities a ON a.id = da.activity_id
      WHERE da.date = ?
    `, [reportDate]);
    const goals = await query('SELECT * FROM goals WHERE active = 1');
    const recentHistory = await query(
      "SELECT * FROM checkins WHERE date <= ? ORDER BY date DESC LIMIT 7",
      [reportDate]
    );

    const generated = [];
    const now = new Date().toISOString();

    for (const catId of targetCategories) {
      const cat = EVOLUTION_CATEGORIES.find(c => c.id === catId);
      if (!cat) continue;

      // Build report content based on available data
      const domainActivities = activities.filter(a => a.domain === catId);
      const domainGoals = goals.filter(g => g.domain === catId);
      const scoreKey = `${catId}_score`;

      // Calculate trend from history
      const scores = recentHistory
        .map(h => h[scoreKey])
        .filter(s => s != null)
        .reverse();
      const trend = scores.length >= 2
        ? scores[scores.length - 1] - scores[0]
        : 0;
      const avg = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

      const content = buildReport(cat, {
        checkin,
        domainActivities,
        domainGoals,
        scores,
        trend,
        avg,
        reportDate,
      });

      const scoresJson = JSON.stringify({ current: checkin?.[scoreKey] || null, avg, trend, history: scores });

      // Upsert
      const existing = await queryOne('SELECT id FROM daily_reports WHERE date = ? AND category = ?', [reportDate, catId]);
      if (existing) {
        await execute(
          'UPDATE daily_reports SET content = ?, scores = ?, generated_at = ? WHERE id = ?',
          [content, scoresJson, now, existing.id]
        );
      } else {
        await execute(
          'INSERT INTO daily_reports (date, category, content, scores, generated_at) VALUES (?,?,?,?,?)',
          [reportDate, catId, content, scoresJson, now]
        );
      }

      generated.push({ category: catId, label: cat.label });
    }

    res.json({ success: true, date: reportDate, reports: generated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM daily_reports WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildReport(category, data) {
  const { checkin, domainActivities, domainGoals, scores, trend, avg, reportDate } = data;
  const lines = [];

  lines.push(`## ${category.icon} ${category.label} Report — ${reportDate}`);
  lines.push('');

  // Score summary
  if (checkin) {
    const score = checkin[`${category.id}_score`];
    if (score != null) {
      const trendIcon = trend > 0 ? '+' : trend < 0 ? '-' : '=';
      lines.push(`**Today's Score:** ${score}/100 ${trendIcon} (${trend >= 0 ? '+' : ''}${trend} from 7-day start)`);
      if (avg != null) lines.push(`**7-Day Average:** ${avg}/100`);
      lines.push('');
    }
  } else {
    lines.push('*No check-in data for today.*');
    lines.push('');
  }

  // Activities
  if (domainActivities.length > 0) {
    lines.push(`### Activities (${domainActivities.length})`);
    for (const a of domainActivities) {
      const sign = a.impact === 'positive' ? '+' : '-';
      const pts = a.weight * 3;
      lines.push(`- ${a.icon || '-'} ${a.name} (${sign}${pts}pts)`);
    }
    lines.push('');
  }

  // Goals
  if (domainGoals.length > 0) {
    lines.push(`### Active Goals (${domainGoals.length})`);
    for (const g of domainGoals) {
      const progress = g.target_value > 0 ? Math.round((g.current_value / g.target_value) * 100) : 0;
      lines.push(`- ${g.title || g.metric}: ${g.current_value}/${g.target_value} ${g.target_label || ''} (${progress}%)`);
    }
    lines.push('');
  }

  // Insights based on data
  if (scores.length >= 3) {
    const recentTrend = scores.slice(-3);
    const allUp = recentTrend.every((s, i) => i === 0 || s >= recentTrend[i - 1]);
    const allDown = recentTrend.every((s, i) => i === 0 || s <= recentTrend[i - 1]);

    if (allUp) lines.push('**Insight:** Consistent upward trend over the last 3 days. Keep the momentum going!');
    else if (allDown) lines.push('**Insight:** Scores have been declining. Consider what changes could help.');
    else lines.push('**Insight:** Scores fluctuating — look for patterns in your daily activities.');
  }

  return lines.join('\n');
}

module.exports = router;
