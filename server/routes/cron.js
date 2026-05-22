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

module.exports = router;
