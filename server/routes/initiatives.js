const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db/database');
const { optionalAuth } = require('../middleware/auth');

router.use(optionalAuth);

function userId(req) { return req.user?.id || null; }

// GET /api/initiatives
router.get('/', async (req, res) => {
  try {
    const uid = userId(req);
    const rows = await query(
      `SELECT i.*,
              COUNT(DISTINCT m.id)::int AS milestone_count,
              COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END)::int AS milestones_done
       FROM initiatives i
       LEFT JOIN milestones m ON m.initiative_id = i.id
       WHERE (i.user_id = ? OR i.user_id IS NULL)
         AND i.status != 'archived'
       GROUP BY i.id
       ORDER BY i.created_at DESC`,
      [uid]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/initiatives
router.post('/', async (req, res) => {
  try {
    const { name, description, status = 'active', pillar_emphasis, target_date, domain } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const rows = await execute(
      `INSERT INTO initiatives (user_id, name, description, status, pillar_emphasis, target_date, domain)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [userId(req), name.trim(), description || null, status, pillar_emphasis || null, target_date || null, domain || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/initiatives/:id
router.patch('/:id', async (req, res) => {
  try {
    const { name, description, status, pillar_emphasis, target_date, domain } = req.body;
    const updates = []; const params = [];
    if (name !== undefined)            { updates.push('name = ?');            params.push(name); }
    if (description !== undefined)     { updates.push('description = ?');     params.push(description); }
    if (status !== undefined)          { updates.push('status = ?');          params.push(status); }
    if (pillar_emphasis !== undefined) { updates.push('pillar_emphasis = ?'); params.push(pillar_emphasis); }
    if (target_date !== undefined)     { updates.push('target_date = ?');     params.push(target_date); }
    if (domain !== undefined)          { updates.push('domain = ?');          params.push(domain); }
    updates.push('updated_at = NOW()');
    if (updates.length < 2) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id, userId(req));
    await execute(`UPDATE initiatives SET ${updates.join(', ')} WHERE id = ? AND (user_id = ? OR user_id IS NULL)`, params);
    const row = await queryOne('SELECT * FROM initiatives WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/initiatives/:id
router.delete('/:id', async (req, res) => {
  try {
    await execute('UPDATE initiatives SET status = ? WHERE id = ? AND (user_id = ? OR user_id IS NULL)', ['archived', req.params.id, userId(req)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Milestones ────────────────────────────────────────────

// GET /api/initiatives/:id/milestones
router.get('/:id/milestones', async (req, res) => {
  try {
    const rows = await query(
      `SELECT m.*, COUNT(a.id)::int AS artifact_count
       FROM milestones m
       LEFT JOIN artifacts a ON a.milestone_id = m.id
       WHERE m.initiative_id = ?
       GROUP BY m.id
       ORDER BY m.sequence, m.created_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/initiatives/:id/milestones
router.post('/:id/milestones', async (req, res) => {
  try {
    const { title, description, sequence, target_date } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title required' });
    const rows = await execute(
      `INSERT INTO milestones (initiative_id, title, description, sequence, target_date)
       VALUES (?, ?, ?, ?, ?) RETURNING *`,
      [req.params.id, title.trim(), description || null, sequence ?? 0, target_date || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/initiatives/:initiativeId/milestones/:milestoneId
router.patch('/:initiativeId/milestones/:milestoneId', async (req, res) => {
  try {
    const { title, description, status, target_date, sequence } = req.body;
    const updates = []; const params = [];
    if (title !== undefined)       { updates.push('title = ?');       params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'completed') { updates.push('completed_at = NOW()'); }
    }
    if (target_date !== undefined) { updates.push('target_date = ?'); params.push(target_date); }
    if (sequence !== undefined)    { updates.push('sequence = ?');    params.push(sequence); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.milestoneId);
    await execute(`UPDATE milestones SET ${updates.join(', ')} WHERE id = ?`, params);
    const row = await queryOne('SELECT * FROM milestones WHERE id = ?', [req.params.milestoneId]);
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/initiatives/:initiativeId/milestones/:milestoneId
router.delete('/:initiativeId/milestones/:milestoneId', async (req, res) => {
  try {
    await execute('DELETE FROM milestones WHERE id = ?', [req.params.milestoneId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Artifacts ─────────────────────────────────────────────

// POST /api/initiatives/:id/artifacts
router.post('/:id/artifacts', async (req, res) => {
  try {
    const { title, type = 'link', url, notes, milestone_id } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title required' });
    const rows = await execute(
      `INSERT INTO artifacts (initiative_id, milestone_id, type, title, url, notes)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      [req.params.id, milestone_id || null, type, title.trim(), url || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/initiatives/:id/artifacts
router.get('/:id/artifacts', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM artifacts WHERE initiative_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
