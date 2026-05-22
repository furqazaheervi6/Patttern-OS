const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db/database');

// GET /api/reminders
router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM reminders ORDER BY time ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reminders
router.post('/', async (req, res) => {
  try {
    const { title, type, time, days, integration, message } = req.body;
    if (!title || !time) {
      return res.status(400).json({ error: 'title and time are required' });
    }
    const now = new Date().toISOString();
    await execute(
      'INSERT INTO reminders (title, type, time, days, integration, message, created_at) VALUES (?,?,?,?,?,?,?)',
      [title, type || 'checkin', time, days || '1,2,3,4,5,6,7', integration || null, message || null, now]
    );
    const reminder = await queryOne('SELECT * FROM reminders ORDER BY id DESC LIMIT 1');
    res.json({ success: true, reminder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reminders/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, type, time, days, integration, message, enabled } = req.body;
    await execute(
      `UPDATE reminders SET
        title = COALESCE(?, title),
        type = COALESCE(?, type),
        time = COALESCE(?, time),
        days = COALESCE(?, days),
        integration = COALESCE(?, integration),
        message = COALESCE(?, message),
        enabled = COALESCE(?, enabled)
      WHERE id = ?`,
      [title ?? null, type ?? null, time ?? null, days ?? null, integration ?? null, message ?? null, enabled ?? null, req.params.id]
    );
    const reminder = await queryOne('SELECT * FROM reminders WHERE id = ?', [req.params.id]);
    res.json({ success: true, reminder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reminders/:id
router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM reminders WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reminders/:id/toggle
router.post('/:id/toggle', async (req, res) => {
  try {
    const reminder = await queryOne('SELECT * FROM reminders WHERE id = ?', [req.params.id]);
    if (!reminder) return res.status(404).json({ error: 'Not found' });
    await execute('UPDATE reminders SET enabled = ? WHERE id = ?', [reminder.enabled ? 0 : 1, req.params.id]);
    const updated = await queryOne('SELECT * FROM reminders WHERE id = ?', [req.params.id]);
    res.json({ success: true, reminder: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
