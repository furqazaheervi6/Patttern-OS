const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db/database');

// GET /api/digest — all digests, newest first
router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM digests ORDER BY generated_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/digest/latest
router.get('/latest', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM digests ORDER BY generated_at DESC LIMIT 1');
    res.json(row || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/digest/:id
router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM digests WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
