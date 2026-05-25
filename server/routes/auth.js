const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query, queryOne, execute } = require('../db/database');
const { signToken, requireAuth } = require('../middleware/auth');

const SALT_ROUNDS = 12;

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, mode = 'personal' } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const rows = await execute(
      `INSERT INTO users (email, password_hash, name, mode) VALUES (?, ?, ?, ?) RETURNING id, email, name, mode, plan, onboarded, created_at`,
      [email.toLowerCase().trim(), hash, name?.trim() || null, mode]
    );
    const user = rows[0];
    const token = signToken({ id: user.id, email: user.email, mode: user.mode, plan: user.plan });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, mode: user.mode, plan: user.plan, onboarded: user.onboarded } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken({ id: user.id, email: user.email, mode: user.mode, plan: user.plan });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, mode: user.mode, plan: user.plan, onboarded: user.onboarded } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, email, name, mode, plan, onboarded, created_at, subscription_end FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/me — update profile
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { name, mode, onboarded } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (mode !== undefined) { updates.push('mode = ?'); params.push(mode); }
    if (onboarded !== undefined) { updates.push('onboarded = ?'); params.push(onboarded); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.user.id);
    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    const user = await queryOne('SELECT id, email, name, mode, plan, onboarded FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/password — change password
router.patch('/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
    if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

    const hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
