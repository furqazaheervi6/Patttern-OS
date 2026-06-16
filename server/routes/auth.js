const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query, queryOne, execute } = require('../db/database');
const { signToken, requireAuth } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');

const SALT_ROUNDS = 12;
const IS_DEV = process.env.NODE_ENV !== 'production';
const DEV_EMAIL = 'furqazaheerxi6@gmail.com';

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
    if (!rows || !rows[0]) return res.status(503).json({ error: 'Database unavailable — try again shortly' });
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

    const normalEmail = email.toLowerCase().trim();
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [normalEmail]);

    // Dev bypass: accept any password for the dev email; auto-create account if needed
    if (IS_DEV && normalEmail === DEV_EMAIL) {
      if (!user) {
        const hash = await bcrypt.hash('devpassword', SALT_ROUNDS);
        const rows = await execute(
          `INSERT INTO users (email, password_hash, name, mode, onboarded) VALUES (?, ?, 'Furqan', 'builder', true) RETURNING id, email, name, mode, plan, onboarded`,
          [normalEmail, hash]
        );
        if (!rows || !rows[0]) return res.status(503).json({ error: 'Database unavailable' });
        const newUser = rows[0];
        const token = signToken({ id: newUser.id, email: newUser.email, mode: newUser.mode, plan: newUser.plan });
        return res.json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name, mode: newUser.mode, plan: newUser.plan, onboarded: newUser.onboarded } });
      }
      const token = signToken({ id: user.id, email: user.email, mode: user.mode, plan: user.plan });
      return res.json({ token, user: { id: user.id, email: user.email, name: user.name, mode: user.mode, plan: user.plan, onboarded: user.onboarded } });
    }

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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await queryOne('SELECT id, email FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    // Always respond with success to avoid leaking whether an account exists
    if (!user) return res.json({ success: true });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing unused tokens for this user
    await execute(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`,
      [user.id]
    );

    await execute(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
      [user.id, tokenHash, expiresAt.toISOString()]
    );

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail({ to: user.email, resetUrl });

    res.json({ success: true });
  } catch (err) {
    console.error('forgot-password error:', err.message);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) return res.status(400).json({ error: 'Token and new password required' });
    if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await queryOne(
      `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?`,
      [tokenHash]
    );

    if (!record) return res.status(400).json({ error: 'Invalid or expired reset link' });
    if (record.used_at) return res.status(400).json({ error: 'This reset link has already been used' });
    if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Reset link has expired' });

    const hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, record.user_id]);
    await execute('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [record.id]);

    res.json({ success: true });
  } catch (err) {
    console.error('reset-password error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
