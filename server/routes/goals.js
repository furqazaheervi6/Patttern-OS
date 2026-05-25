const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db/database');
const { optionalAuth } = require('../middleware/auth');

// GET /api/goals — all active goals (or include completed)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { domain, include_completed } = req.query;
    const uf = userId ? 'AND (user_id = ? OR user_id IS NULL)' : 'AND user_id IS NULL';
    let sql = `SELECT * FROM goals WHERE 1=1 ${uf}`;
    const params = userId ? [userId] : [];

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
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const uf = userId ? 'AND (user_id = ? OR user_id IS NULL)' : 'AND user_id IS NULL';
    const goal = await queryOne(`SELECT * FROM goals WHERE id = ? ${uf}`, userId ? [req.params.id, userId] : [req.params.id]);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals — create a goal
router.post('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { title, domain, metric, target_value, target_label, description, deadline, priority, category } = req.body;
    if (!domain || !metric) {
      return res.status(400).json({ error: 'domain and metric are required' });
    }
    const now = new Date().toISOString();
    const result = await execute(
      `INSERT INTO goals (title, domain, metric, target_value, target_label, description, deadline, priority, category, user_id, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
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
        userId,
        now, now,
      ]
    );
    const goalId = result[0]?.id;
    const goal = goalId ? await queryOne('SELECT * FROM goals WHERE id = ?', [goalId]) : null;
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/goals/:id — update a goal
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { title, target_value, target_label, current_value, description, deadline, priority, category, active } = req.body;
    const now = new Date().toISOString();
    const uf = userId ? 'AND (user_id = ? OR user_id IS NULL)' : 'AND user_id IS NULL';
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
      WHERE id = ? ${uf}`,
      [
        title ?? null, target_value ?? null, target_label ?? null,
        current_value ?? null, description ?? null, deadline ?? null,
        priority ?? null, category ?? null, active ?? null,
        now, req.params.id, ...(userId ? [userId] : []),
      ]
    );
    const goal = await queryOne('SELECT * FROM goals WHERE id = ?', [req.params.id]);
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals/:id/complete — mark goal as completed
router.post('/:id/complete', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const now = new Date().toISOString();
    const uf = userId ? 'AND (user_id = ? OR user_id IS NULL)' : 'AND user_id IS NULL';
    await execute(
      `UPDATE goals SET completed = 1, completed_at = ?, active = 0, updated_at = ? WHERE id = ? ${uf}`,
      [now, now, req.params.id, ...(userId ? [userId] : [])]
    );
    const goal = await queryOne('SELECT * FROM goals WHERE id = ?', [req.params.id]);
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals/:id/progress — update current_value
router.post('/:id/progress', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { value, increment } = req.body;
    const now = new Date().toISOString();
    const uf = userId ? 'AND (user_id = ? OR user_id IS NULL)' : 'AND user_id IS NULL';

    if (increment) {
      const goal = await queryOne(`SELECT current_value FROM goals WHERE id = ? ${uf}`, userId ? [req.params.id, userId] : [req.params.id]);
      if (!goal) return res.status(404).json({ error: 'Goal not found' });
      const newVal = (goal.current_value || 0) + increment;
      await execute(`UPDATE goals SET current_value = ?, updated_at = ? WHERE id = ? ${uf}`, [newVal, now, req.params.id, ...(userId ? [userId] : [])]);
    } else if (value != null) {
      await execute(`UPDATE goals SET current_value = ?, updated_at = ? WHERE id = ? ${uf}`, [value, now, req.params.id, ...(userId ? [userId] : [])]);
    }

    const goal = await queryOne('SELECT * FROM goals WHERE id = ?', [req.params.id]);

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
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const uf = userId ? 'AND (user_id = ? OR user_id IS NULL)' : 'AND user_id IS NULL';
    await execute(`UPDATE goals SET active = 0, updated_at = ? WHERE id = ? ${uf}`, [new Date().toISOString(), req.params.id, ...(userId ? [userId] : [])]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
