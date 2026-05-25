/**
 * Background jobs — runs locally via setInterval.
 * In production (Vercel), use vercel.json cron + routes/cron.js.
 */

let syncInterval = null;
let isSyncing = false;

function startCronJobs() {
  if (process.env.VERCEL) return;

  // Import lazily to avoid circular deps at startup
  const runNotionSync = async () => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      const { syncAndEnrichAll } = require('./notionService');
      await syncAndEnrichAll();
    } catch (err) {
      console.error('[Cron] Notion sync error:', err.message);
    } finally {
      isSyncing = false;
    }
  };

  const runWeeklyDigest = async () => {
    try {
      const { generateWeeklyDigest } = require('./claudeAgent');
      await generateWeeklyDigest();
      console.log('[Cron] Weekly digest generated');
    } catch (err) {
      console.error('[Cron] Digest error:', err.message);
    }
  };

  // First sync 2 minutes after startup (let the server settle), then every 15 minutes
  setTimeout(runNotionSync, 2 * 60 * 1000);
  syncInterval = setInterval(runNotionSync, 15 * 60 * 1000);

  // Weekly digest every Monday at 8 AM (check via interval)
  setInterval(() => {
    const now = new Date();
    if (now.getDay() === 1 && now.getHours() === 8 && now.getMinutes() < 5) {
      runWeeklyDigest();
    }
  }, 5 * 60 * 1000);

  console.log('  Background sync: Notion every 10 min, digest weekly');
}

function stopCronJobs() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

module.exports = { startCronJobs, stopCronJobs };
