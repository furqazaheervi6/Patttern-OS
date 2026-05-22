const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db/database');
const { computeAllScores } = require('../utils/pillarScorer');
const { detectPatternAlerts } = require('../services/claudeAgent');
const { computeActivityModifiers, applyModifiers } = require('../utils/activityScorer');

// Input validation
function validateCheckin(data) {
  const errors = [];
  if (data.sleep_hours != null && (data.sleep_hours < 0 || data.sleep_hours > 24)) errors.push('sleep_hours must be 0-24');
  if (data.energy_score != null && (data.energy_score < 1 || data.energy_score > 10)) errors.push('energy_score must be 1-10');
  if (data.nutrition_score != null && (data.nutrition_score < 1 || data.nutrition_score > 10)) errors.push('nutrition_score must be 1-10');
  if (data.focus_score != null && (data.focus_score < 1 || data.focus_score > 10)) errors.push('focus_score must be 1-10');
  if (data.mood_score != null && (data.mood_score < 1 || data.mood_score > 10)) errors.push('mood_score must be 1-10');
  if (data.stress_score != null && (data.stress_score < 1 || data.stress_score > 10)) errors.push('stress_score must be 1-10');
  if (data.productive_hours != null && (data.productive_hours < 0 || data.productive_hours > 24)) errors.push('productive_hours must be 0-24');
  if (data.purpose_score != null && (data.purpose_score < 1 || data.purpose_score > 10)) errors.push('purpose_score must be 1-10');
  if (data.alignment_score != null && (data.alignment_score < 1 || data.alignment_score > 10)) errors.push('alignment_score must be 1-10');
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push('date must be YYYY-MM-DD format');
  return errors;
}

// POST /api/checkin — save or update today's check-in
router.post('/', async (req, res) => {
  try {
    const data = req.body;

    const validationErrors = validateCheckin(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    const date = data.date || new Date().toISOString().split('T')[0];

    const scores = computeAllScores(data);
    const now = new Date().toISOString();

    const vals = [
      date,
      data.sleep_hours ?? null,
      data.exercise ? 1 : 0,
      data.energy_score ?? null,
      data.nutrition_score ?? null,
      data.focus_score ?? null,
      data.mood_score ?? null,
      data.stress_score ?? null,
      data.learning ? 1 : 0,
      data.productive_hours ?? null,
      data.milestone_hit ? 1 : 0,
      data.revenue_note ?? null,
      data.runway_note ?? null,
      data.reflection_done ? 1 : 0,
      data.purpose_score ?? null,
      data.gratitude_done ? 1 : 0,
      data.alignment_score ?? null,
      scores.physical_score,
      scores.mental_score,
      scores.financial_score,
      scores.spiritual_score,
      scores.overall_score,
      now,
    ];

    await execute(`
      INSERT INTO checkins (
        date, sleep_hours, exercise, energy_score, nutrition_score,
        focus_score, mood_score, stress_score, learning,
        productive_hours, milestone_hit, revenue_note, runway_note,
        reflection_done, purpose_score, gratitude_done, alignment_score,
        physical_score, mental_score, financial_score, spiritual_score, overall_score,
        updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(date) DO UPDATE SET
        sleep_hours=EXCLUDED.sleep_hours, exercise=EXCLUDED.exercise,
        energy_score=EXCLUDED.energy_score, nutrition_score=EXCLUDED.nutrition_score,
        focus_score=EXCLUDED.focus_score, mood_score=EXCLUDED.mood_score,
        stress_score=EXCLUDED.stress_score, learning=EXCLUDED.learning,
        productive_hours=EXCLUDED.productive_hours, milestone_hit=EXCLUDED.milestone_hit,
        revenue_note=EXCLUDED.revenue_note, runway_note=EXCLUDED.runway_note,
        reflection_done=EXCLUDED.reflection_done, purpose_score=EXCLUDED.purpose_score,
        gratitude_done=EXCLUDED.gratitude_done, alignment_score=EXCLUDED.alignment_score,
        physical_score=EXCLUDED.physical_score, mental_score=EXCLUDED.mental_score,
        financial_score=EXCLUDED.financial_score, spiritual_score=EXCLUDED.spiritual_score,
        overall_score=EXCLUDED.overall_score, updated_at=EXCLUDED.updated_at
    `, vals);

    let saved = await queryOne('SELECT * FROM checkins WHERE date = ?', [date]);

    // Apply activity-based score modifiers if any activities are logged today
    const dailyActivities = await query(`
      SELECT da.intensity, a.name, a.domain, a.impact, a.weight, a.icon
      FROM daily_activities da
      JOIN activities a ON a.id = da.activity_id AND a.active = 1
      WHERE da.date = ?
    `, [date]);

    if (dailyActivities.length > 0) {
      const modifiers = computeActivityModifiers(dailyActivities);
      const adjusted = applyModifiers(scores, modifiers);
      await execute(
        `UPDATE checkins SET physical_score=?, mental_score=?, financial_score=?, spiritual_score=?, overall_score=? WHERE date=?`,
        [adjusted.physical_score, adjusted.mental_score, adjusted.financial_score, adjusted.spiritual_score, adjusted.overall_score, date]
      );
      saved = await queryOne('SELECT * FROM checkins WHERE date = ?', [date]);
    }

    // Async pattern alert — don't block response
    const recent = await query(
      'SELECT * FROM checkins WHERE date < ? ORDER BY date DESC LIMIT 7',
      [date]
    );

    detectPatternAlerts(saved, recent).then(async (result) => {
      if (result?.alert && result.description) {
        await execute(
          'INSERT INTO pattern_alerts (detected_on, pillar_a, pillar_b, description, severity) VALUES (?,?,?,?,?)',
          [date, result.pillar_a || null, result.pillar_b || null, result.description, result.severity || 'info']
        );
      }
    }).catch(() => {});

    res.json({ success: true, checkin: saved, scores });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/checkin/today
router.get('/today', async (req, res) => {
  try {
    // Try UTC date first, then local date, then most recent entry
    const utcToday = new Date().toISOString().split('T')[0];
    let row = await queryOne('SELECT * FROM checkins WHERE date = ?', [utcToday]);
    if (!row) {
      // Try local date (offset from UTC)
      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      row = await queryOne('SELECT * FROM checkins WHERE date = ?', [localToday]);
    }
    if (!row) {
      // Fallback: most recent entry from today or yesterday
      row = await queryOne("SELECT * FROM checkins WHERE date >= (CURRENT_DATE - 1)::text ORDER BY date DESC LIMIT 1");
    }
    res.json(row || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/checkin/history?days=30
router.get('/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const rows = await query(
      `SELECT * FROM checkins WHERE date >= (CURRENT_DATE - ?::int)::text ORDER BY date DESC`,
      [days]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/checkin/alerts
router.get('/alerts', async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM pattern_alerts WHERE dismissed = 0 ORDER BY created_at DESC LIMIT 10'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/checkin/alerts/:id/dismiss
router.post('/alerts/:id/dismiss', async (req, res) => {
  try {
    await execute('UPDATE pattern_alerts SET dismissed = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/checkin/:date
router.get('/:date', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM checkins WHERE date = ?', [req.params.date]);
    res.json(row || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
