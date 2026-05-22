const express = require('express');
const router = express.Router();
const { generateWeeklyDigest, detectPatternAlerts, extractPillarSignalsFromNotion } = require('../services/claudeAgent');
const { query, queryOne, execute } = require('../db/database');

// POST /api/agent/digest — manually trigger weekly digest
router.post('/digest', async (req, res) => {
  try {
    const result = await generateWeeklyDigest();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agent/alerts — run pattern alert check
router.post('/alerts', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const latest = await queryOne('SELECT * FROM checkins WHERE date = ?', [today]);
    const recent = await query(
      'SELECT * FROM checkins WHERE date < ? ORDER BY date DESC LIMIT 7',
      [today]
    );

    const result = await detectPatternAlerts(latest, recent);

    if (result?.alert && result.description) {
      await execute(
        'INSERT INTO pattern_alerts (detected_on, pillar_a, pillar_b, description, severity) VALUES (?,?,?,?,?)',
        [today, result.pillar_a || null, result.pillar_b || null, result.description, result.severity || 'info']
      );
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agent/map-notion
router.post('/map-notion', async (req, res) => {
  try {
    const { content, date } = req.body;
    if (!content) return res.status(400).json({ error: 'Missing content' });
    const signals = await extractPillarSignalsFromNotion(
      content,
      date || new Date().toISOString().split('T')[0]
    );
    res.json({ success: true, signals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
