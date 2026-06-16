/**
 * Background jobs — runs locally via setInterval.
 * In production (Vercel), use vercel.json cron + routes/cron.js.
 */

let syncInterval = null;
let isSyncing = false;

function startCronJobs() {
  if (process.env.VERCEL) return;

  // Import lazily to avoid circular deps at startup
  const isDbReachable = async () => {
    try {
      const { getPool } = require('../db/database');
      const sql = getPool();
      if (!sql) return false;
      await sql`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  };

  const runNotionSync = async () => {
    if (isSyncing) return;
    if (!await isDbReachable()) return;
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

  const runMemoryExtraction = async () => {
    if (!await isDbReachable()) return;
    try {
      const { query } = require('../db/database');
      const { extractMemories, updateCompletionStats } = require('./memoryService');
      const users = await query(
        `SELECT DISTINCT user_id FROM checkins WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*) >= 5`
      );
      for (const { user_id } of users) {
        await extractMemories(user_id);
        await updateCompletionStats(user_id);
      }
      console.log(`[Cron] Memory extraction complete for ${users.length} users`);
    } catch (err) {
      console.error('[Cron] Memory extraction error:', err.message);
    }
  };

  const runPatternAnalysis = async () => {
    if (!await isDbReachable()) return;
    try {
      const { analyzeAllUsers } = require('./patternAnalyzer');
      await analyzeAllUsers();
    } catch (err) {
      console.error('[Cron] Pattern analysis error:', err.message);
    }
  };

  const runResearchAgent = async () => {
    if (!await isDbReachable()) return;
    try {
      const { researchAllUsers } = require('./researchAgent');
      await researchAllUsers();
    } catch (err) {
      console.error('[Cron] Research agent error:', err.message);
    }
  };

  // First sync 2 minutes after startup (let the server settle), then every 15 minutes
  setTimeout(runNotionSync, 2 * 60 * 1000);
  syncInterval = setInterval(runNotionSync, 15 * 60 * 1000);

  // Weekly jobs: check every 5 minutes, fire on Monday 8 AM
  setInterval(() => {
    const now = new Date();
    const isMonday8am = now.getDay() === 1 && now.getHours() === 8 && now.getMinutes() < 5;
    if (isMonday8am) {
      runWeeklyDigest();
      runMemoryExtraction();
      runPatternAnalysis();
    }
  }, 5 * 60 * 1000);

  // Daily research: check every 5 minutes, fire at 6 AM daily
  setInterval(() => {
    const now = new Date();
    const is6am = now.getHours() === 6 && now.getMinutes() < 5;
    if (is6am) {
      runResearchAgent();
    }
  }, 5 * 60 * 1000);

  // Also run memory extraction 5 minutes after startup for immediate effect on dev
  setTimeout(async () => {
    if (await isDbReachable()) {
      runMemoryExtraction().catch(() => {});
      runResearchAgent().catch(() => {});
    }
  }, 5 * 60 * 1000);

  console.log('  Background sync: Notion every 15 min, memory+patterns weekly, research daily');
}

function stopCronJobs() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

module.exports = { startCronJobs, stopCronJobs };
