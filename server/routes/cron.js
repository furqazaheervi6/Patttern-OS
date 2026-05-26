/**
 * Vercel Cron endpoints.
 * These replace node-cron jobs for serverless deployment.
 * Protected by CRON_SECRET to prevent unauthorized access.
 */
const express = require('express');
const router = express.Router();

function verifyCronSecret(req, res, next) {
  // Vercel sends the secret in the Authorization header for cron jobs
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  // In local dev or if no secret configured, allow through
  if (!cronSecret || !process.env.VERCEL) return next();

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /api/cron/digest — Weekly digest generation (Monday 8am)
router.get('/digest', verifyCronSecret, async (req, res) => {
  try {
    const { generateWeeklyDigest } = require('../services/claudeAgent');
    console.log('Cron: Running weekly digest generation...');
    const result = await generateWeeklyDigest();
    console.log('Cron: Weekly digest generated.');
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Cron: Digest generation failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cron/notion-sync — Daily Notion sync (6am)
router.get('/notion-sync', verifyCronSecret, async (req, res) => {
  try {
    const { fetchRecentPages } = require('../services/notionService');
    console.log('Cron: Syncing Notion pages...');
    const pages = await fetchRecentPages(7);
    console.log('Cron: Notion sync complete.');
    res.json({ success: true, synced: pages.length });
  } catch (err) {
    console.error('Cron: Notion sync failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cron/morning-brief — Send morning brief push notifications (7am)
router.get('/morning-brief', verifyCronSecret, async (req, res) => {
  try {
    const { query } = require('../db/database');
    const { sendPushToUser } = require('./push');

    const today = new Date().toISOString().split('T')[0];

    // Get all users with push subscriptions
    const subscribers = await query(
      `SELECT DISTINCT ps.user_id
       FROM push_subscriptions ps
       WHERE ps.user_id IS NOT NULL`
    );

    if (subscribers.length === 0) {
      return res.json({ success: true, sent: 0, reason: 'no subscribers' });
    }

    let sent = 0;
    for (const { user_id } of subscribers) {
      try {
        // Get today's plan block count
        const blocks = await query(
          `SELECT COUNT(*) AS cnt, pillar
           FROM calendar_blocks
           WHERE date = ? AND user_id = ? AND replaced_at IS NULL
           GROUP BY pillar
           ORDER BY cnt DESC`,
          [today, user_id]
        );

        // Get yesterday's overall score for motivation context
        const checkin = await query(
          `SELECT overall_score FROM checkins
           WHERE user_id = ? AND date < ? ORDER BY date DESC LIMIT 1`,
          [user_id, today]
        );

        const blockCount = blocks.reduce((s, r) => s + parseInt(r.cnt), 0);
        const topPillar = blocks[0]?.pillar || null;
        const prevScore = checkin[0]?.overall_score ? Math.round(parseFloat(checkin[0].overall_score)) : null;

        let body = blockCount > 0
          ? `${blockCount} blocks planned${topPillar ? ` · ${topPillar} focus` : ''}. Open to review your day.`
          : 'No plan yet — tap to generate today\'s schedule.';

        if (prevScore != null) {
          body = `Yesterday: ${prevScore}/100 · ${body}`;
        }

        await sendPushToUser(user_id, {
          title: 'PatternOS · Morning Brief',
          body,
          tag: `morning-${today}`,
          url: blockCount > 0 ? '/calendar' : '/calendar',
        });
        sent++;
      } catch {}
    }

    console.log(`Cron: Morning brief sent to ${sent}/${subscribers.length} users.`);
    res.json({ success: true, sent, total: subscribers.length });
  } catch (err) {
    console.error('Cron: Morning brief failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cron/pattern-alerts — Run daily pattern detection and notify (8pm)
router.get('/pattern-alerts', verifyCronSecret, async (req, res) => {
  try {
    const { query } = require('../db/database');
    const { sendPushToUser } = require('./push');
    const { detectPatternAlerts } = require('../services/claudeAgent');

    const subscribers = await query(
      `SELECT DISTINCT ps.user_id
       FROM push_subscriptions ps
       WHERE ps.user_id IS NOT NULL`
    );

    let notified = 0;
    for (const { user_id } of subscribers) {
      try {
        const rows = await query(
          `SELECT * FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT 8`,
          [user_id]
        );
        if (rows.length < 2) continue;
        const [latest, ...recent] = rows;
        const result = await detectPatternAlerts(latest, recent);
        if (result && result.alert) {
          const pillar = result.pillar_a || result.pillar_b || 'Pattern';
          const label = pillar.charAt(0).toUpperCase() + pillar.slice(1);
          await sendPushToUser(user_id, {
            title: `PatternOS · ${label} Alert`,
            body: result.description || 'A pattern shift detected in your data.',
            tag: 'pattern-alert',
            url: '/history',
          });
          notified++;
        }
      } catch {}
    }

    res.json({ success: true, notified });
  } catch (err) {
    console.error('Cron: Pattern alerts failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
