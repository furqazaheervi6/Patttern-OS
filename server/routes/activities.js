const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db/database');
const { computeActivityModifiers, applyModifiers, getActivityBreakdown } = require('../utils/activityScorer');

const VALID_DOMAINS = ['physical', 'mental', 'financial', 'spiritual', 'social', 'purpose', 'awareness'];

// ─── Activity Definitions ───────────────────────────────

// GET /api/activities — all active activity definitions
router.get('/', async (req, res) => {
  try {
    const domain = req.query.domain;
    const rows = domain
      ? await query('SELECT * FROM activities WHERE active = 1 AND domain = ? ORDER BY domain, impact, name', [domain])
      : await query('SELECT * FROM activities WHERE active = 1 ORDER BY domain, impact, name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/activities — create an activity definition
router.post('/', async (req, res) => {
  try {
    const { name, domain, impact, weight, icon } = req.body;
    if (!name || !domain || !impact) {
      return res.status(400).json({ error: 'name, domain, and impact are required' });
    }
    if (!VALID_DOMAINS.includes(domain)) {
      return res.status(400).json({ error: `domain must be one of: ${VALID_DOMAINS.join(', ')}` });
    }
    if (!['positive', 'negative'].includes(impact)) {
      return res.status(400).json({ error: 'impact must be positive or negative' });
    }
    const w = Math.max(1, Math.min(5, parseInt(weight) || 3));
    const now = new Date().toISOString();
    await execute(
      'INSERT INTO activities (name, domain, impact, weight, icon, created_at) VALUES (?,?,?,?,?,?)',
      [name.trim(), domain, impact, w, icon || '', now]
    );
    const activity = await queryOne('SELECT * FROM activities ORDER BY id DESC LIMIT 1');
    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/activities/:id — update an activity
router.put('/:id', async (req, res) => {
  try {
    const { name, domain, impact, weight, icon, active } = req.body;
    const existing = await queryOne('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Activity not found' });

    await execute(
      `UPDATE activities SET
        name = COALESCE(?, name), domain = COALESCE(?, domain),
        impact = COALESCE(?, impact), weight = COALESCE(?, weight),
        icon = COALESCE(?, icon), active = COALESCE(?, active)
      WHERE id = ?`,
      [name || null, domain || null, impact || null, weight || null, icon ?? null, active ?? null, req.params.id]
    );
    const activity = await queryOne('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/activities/:id — soft-delete
router.delete('/:id', async (req, res) => {
  try {
    await execute('UPDATE activities SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Daily Activity Logging ─────────────────────────────

// GET /api/activities/log?date=YYYY-MM-DD — get logged activities for a day
router.get('/log', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const rows = await query(`
      SELECT da.id, da.date, da.activity_id, da.intensity, da.notes, da.created_at,
             a.name, a.domain, a.impact, a.weight, a.icon
      FROM daily_activities da
      JOIN activities a ON a.id = da.activity_id
      WHERE da.date = ?
      ORDER BY a.domain, a.impact DESC, a.name
    `, [date]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/activities/log — log an activity for today
router.post('/log', async (req, res) => {
  try {
    const { activity_id, date, intensity, notes } = req.body;
    if (!activity_id) {
      return res.status(400).json({ error: 'activity_id is required' });
    }
    const d = date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    await execute(
      'INSERT INTO daily_activities (date, activity_id, intensity, notes, created_at) VALUES (?,?,?,?,?)',
      [d, activity_id, intensity || 1.0, notes || null, now]
    );
    const entry = await queryOne('SELECT * FROM daily_activities ORDER BY id DESC LIMIT 1');
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/activities/log/batch — log multiple activities at once
router.post('/log/batch', async (req, res) => {
  try {
    const { activities, date } = req.body;
    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({ error: 'activities array is required' });
    }
    const d = date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const results = [];
    for (const act of activities) {
      await execute(
        'INSERT INTO daily_activities (date, activity_id, intensity, notes, created_at) VALUES (?,?,?,?,?)',
        [d, act.activity_id, act.intensity || 1.0, act.notes || null, now]
      );
      results.push(act.activity_id);
    }
    res.json({ success: true, logged: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/activities/log/:id — remove a logged activity
router.delete('/log/:id', async (req, res) => {
  try {
    await execute('DELETE FROM daily_activities WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Score Impact ───────────────────────────────────────

// GET /api/activities/impact?date=YYYY-MM-DD — compute how activities affect scores today
router.get('/impact', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Get logged activities with their definitions
    const dailyActivities = await query(`
      SELECT da.intensity, a.name, a.domain, a.impact, a.weight, a.icon
      FROM daily_activities da
      JOIN activities a ON a.id = da.activity_id
      WHERE da.date = ?
    `, [date]);

    const modifiers = computeActivityModifiers(dailyActivities);
    const breakdown = getActivityBreakdown(dailyActivities);

    // Get base scores for comparison
    const checkin = await queryOne('SELECT physical_score, mental_score, financial_score, spiritual_score, overall_score FROM checkins WHERE date = ?', [date]);

    let adjusted = null;
    if (checkin) {
      adjusted = applyModifiers(checkin, modifiers);
    }

    res.json({
      date,
      modifiers,
      breakdown,
      base_scores: checkin || null,
      adjusted_scores: adjusted,
      activity_count: dailyActivities.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
