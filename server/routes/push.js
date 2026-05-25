const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const { execute, query, queryOne } = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Configure VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@patternos.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// GET /api/push/vapid-key — public key for client subscription
router.get('/vapid-key', (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — save subscription
router.post('/subscribe', optionalAuth, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  const userId = req.user?.id || null;
  const ua = req.headers['user-agent']?.slice(0, 255) || null;

  try {
    await execute(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [userId, endpoint, keys.p256dh, keys.auth, ua]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', optionalAuth, async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  try {
    await execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/push/test — send a test notification to the current user
router.post('/test', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const subs = await query('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);

  if (subs.length === 0) {
    return res.status(404).json({ error: 'No push subscription found — enable notifications first' });
  }

  const payload = JSON.stringify({
    title: 'PatternOS',
    body: '✓ Push notifications are working',
    tag: 'test',
    url: '/',
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, payload)
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  res.json({ sent, total: subs.length });
});

// Internal: send push to a user by userId
async function sendPushToUser(userId, payload) {
  const subs = await query('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
  const dead = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          typeof payload === 'string' ? payload : JSON.stringify(payload)
        );
      } catch (err) {
        // 410 = subscription expired, clean up
        if (err.statusCode === 410) dead.push(sub.endpoint);
      }
    })
  );

  if (dead.length > 0) {
    await execute(
      `DELETE FROM push_subscriptions WHERE endpoint = ANY(ARRAY[${dead.map((_, i) => `$${i + 1}`).join(',')}])`,
      dead
    );
  }
}

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
