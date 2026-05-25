const express = require('express');
const router = express.Router();
const { queryOne, execute } = require('../db/database');
const { optionalAuth } = require('../middleware/auth');

// GET /api/settings/:key
router.get('/:key', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    let row = null;
    if (userId) {
      row = await queryOne('SELECT value FROM user_settings WHERE key = ? AND user_id = ? LIMIT 1', [req.params.key, userId]);
    }
    if (!row) {
      row = await queryOne('SELECT value FROM user_settings WHERE key = ? AND user_id IS NULL LIMIT 1', [req.params.key]);
    }
    const value = row?.value ? (typeof row.value === 'string' ? JSON.parse(row.value) : row.value) : null;
    res.json({ key: req.params.key, value });
  } catch {
    res.json({ key: req.params.key, value: null });
  }
});

// PUT /api/settings/:key
router.put('/:key', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { value } = req.body;

    if (userId) {
      await execute(
        `INSERT INTO user_settings (key, value, user_id, updated_at) VALUES (?, ?, ?, NOW())
         ON CONFLICT (key, user_id) WHERE user_id IS NOT NULL
         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [req.params.key, JSON.stringify(value), userId]
      );
    } else {
      await execute(
        `INSERT INTO user_settings (key, value, updated_at) VALUES (?, ?, NOW())
         ON CONFLICT (key) WHERE user_id IS NULL
         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [req.params.key, JSON.stringify(value)]
      );
    }
    res.json({ success: true, key: req.params.key, value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
