const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db/database');

// GET /api/goals — all active goals (or include completed)
router.get('/', async (req, res) => {
  try {
    const { domain, include_completed } = req.query;
    let sql = 'SELECT * FROM goals WHERE 1=1';
    const params = [];

    if (!include_completed) {
      sql += ' AND active = 1';
    }
    if (domain) {
      sql += ' AND domain = ?';
      params.push(domain);
    }
    sql += ' ORDER BY priority DESC, created_at DESC';

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/goals/:id
router.get('/:id', async (req, res) => {
  try {
    const goal = await queryOne('SELECT * FROM goals WHERE id = ?', [req.params.id]);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals — create a goal
router.post('/', async (req, res) => {
  try {
    const { title, domain, metric, target_value, target_label, description, deadline, priority, category } = req.body;
    if (!domain || !metric) {
      return res.status(400).json({ error: 'domain and metric are required' });
    }
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO goals (title, domain, metric, target_value, target_label, description, deadline, priority, category, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        title || metric,
        domain,
        metric,
        target_value || 0,
        target_label || null,
        description || '',
        deadline || null,
        priority || 'medium',
        category || 'habit',
        now, now,
      ]
    );
    const goal = await queryOne('SELECT * FROM goals ORDER BY id DESC LIMIT 1');
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/goals/:id — update a goal
router.put('/:id', async (req, res) => {
  try {
    const { title, target_value, target_label, current_value, description, deadline, priority, category, active } = req.body;
    const now = new Date().toISOString();
    await execute(
      `UPDATE goals SET
        title = COALESCE(?, title),
        target_value = COALESCE(?, target_value),
        target_label = COALESCE(?, target_label),
        current_value = COALESCE(?, current_value),
        description = COALESCE(?, description),
        deadline = COALESCE(?, deadline),
        priority = COALESCE(?, priority),
        category = COALESCE(?, category),
        active = COALESCE(?, active),
        updated_at = ?
      WHERE id = ?`,
      [
        title ?? null, target_value ?? null, target_label ?? null,
        current_value ?? null, description ?? null, deadline ?? null,
        priority ?? null, category ?? null, active ?? null,
        now, req.params.id,
      ]
    );
    const goal = await queryOne('SELECT * FROM goals WHERE id = ?', [req.params.id]);
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals/:id/complete — mark goal as completed
router.post('/:id/complete', async (req, res) => {
  try {
    const now = new Date().toISOString();
    await execute(
      'UPDATE goals SET completed = 1, completed_at = ?, active = 0, updated_at = ? WHERE id = ?',
      [now, now, req.params.id]
    );
    const goal = await queryOne('SELECT * FROM goals WHERE id = ?', [req.params.id]);
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals/:id/progress — update current_value
router.post('/:id/progress', async (req, res) => {
  try {
    const { value, increment } = req.body;
    const now = new Date().toISOString();

    if (increment) {
      const goal = await queryOne('SELECT current_value FROM goals WHERE id = ?', [req.params.id]);
      if (!goal) return res.status(404).json({ error: 'Goal not found' });
      const newVal = (goal.current_value || 0) + increment;
      await execute('UPDATE goals SET current_value = ?, updated_at = ? WHERE id = ?', [newVal, now, req.params.id]);
    } else if (value != null) {
      await execute('UPDATE goals SET current_value = ?, updated_at = ? WHERE id = ?', [value, now, req.params.id]);
    }

    const goal = await queryOne('SELECT * FROM goals WHERE id = ?', [req.params.id]);

    // Auto-complete if target reached
    if (goal && goal.target_value > 0 && goal.current_value >= goal.target_value && !goal.completed) {
      await execute('UPDATE goals SET completed = 1, completed_at = ?, updated_at = ? WHERE id = ?', [now, now, req.params.id]);
      const updated = await queryOne('SELECT * FROM goals WHERE id = ?', [req.params.id]);
      return res.json({ success: true, goal: updated, auto_completed: true });
    }

    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/goals/:id — deactivate a goal
router.delete('/:id', async (req, res) => {
  try {
    await execute('UPDATE goals SET active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
