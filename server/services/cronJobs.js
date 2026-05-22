/**
 * Local development cron jobs.
 * In production (Vercel), cron jobs are handled by Vercel Cron (see vercel.json + routes/cron.js).
 * This file is only used when running locally with `npm run server`.
 */

function startCronJobs() {
  // No-op in serverless / production
  if (process.env.VERCEL) return;

  try {
    const cron = require('node-cron');
    const { generateWeeklyDigest } = require('./claudeAgent');
    const { fetchRecentPages } = require('./notionService');

    // Weekly digest — every Monday at 8:00 AM
    cron.schedule('0 8 * * 1', async () => {
      console.log('Cron: Running weekly digest generation...');
      try {
        await generateWeeklyDigest();
        console.log('Cron: Weekly digest generated.');
      } catch (err) {
        console.error('Cron: Digest generation failed:', err.message);
      }
    });

    // Notion sync — every day at 6:00 AM
    cron.schedule('0 6 * * *', async () => {
      console.log('Cron: Syncing Notion pages...');
      try {
        await fetchRecentPages(7);
        console.log('Cron: Notion sync complete.');
      } catch (err) {
        console.error('Cron: Notion sync failed:', err.message);
      }
    });

    console.log('  Local cron jobs started');
  } catch {
    // node-cron not installed — that's fine in production
    console.log('  Cron: node-cron not available, skipping local cron jobs');
  }
}

module.exports = { startCronJobs };
