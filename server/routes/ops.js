const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db/database');
const { MODEL_PRICING } = require('../utils/usageTracker');

// GET /api/ops/metrics
router.get('/metrics', async (req, res) => {
  try {
    const [
      plansWeek,
      plansToday,
      plansTotal,
      activeDays7,
      activeDays30,
      pillarDist,
      syncStats,
      recentPlans,
    ] = await Promise.allSettled([
      // Plans generated in last 7 days
      queryOne(`SELECT COUNT(*)::int AS count FROM plan_log WHERE created_at >= NOW() - INTERVAL '7 days'`),
      // Plans generated today
      queryOne(`SELECT COUNT(*)::int AS count FROM plan_log WHERE date = CURRENT_DATE::text`),
      // Total plans ever
      queryOne(`SELECT COUNT(*)::int AS count FROM plan_log WHERE error IS NULL`),
      // Active days with a plan in last 7 days
      queryOne(`SELECT COUNT(DISTINCT date)::int AS count FROM calendar_blocks WHERE replaced_at IS NULL AND date >= (CURRENT_DATE - INTERVAL '7 days')::text`),
      // Active days with a plan in last 30 days
      queryOne(`SELECT COUNT(DISTINCT date)::int AS count FROM calendar_blocks WHERE replaced_at IS NULL AND date >= (CURRENT_DATE - INTERVAL '30 days')::text`),
      // Pillar time distribution (last 7 days, minutes per pillar)
      query(`
        SELECT pillar,
               SUM(
                 (CAST(split_part(end_time, ':', 1) AS INT) * 60 + CAST(split_part(end_time, ':', 2) AS INT)) -
                 (CAST(split_part(start_time, ':', 1) AS INT) * 60 + CAST(split_part(start_time, ':', 2) AS INT))
               )::int AS minutes
        FROM calendar_blocks
        WHERE replaced_at IS NULL
          AND date >= (CURRENT_DATE - INTERVAL '7 days')::text
        GROUP BY pillar
        ORDER BY minutes DESC
      `),
      // Sync stats (last 30 days)
      queryOne(`
        SELECT
          COUNT(*)::int                                       AS total_blocks,
          COUNT(gcal_event_id)::int                          AS gcal_synced,
          ROUND(
            100.0 * COUNT(gcal_event_id) / NULLIF(COUNT(*), 0), 1
          )::float                                           AS sync_rate
        FROM calendar_blocks
        WHERE replaced_at IS NULL
          AND date >= (CURRENT_DATE - INTERVAL '30 days')::text
      `),
      // Recent 10 plan log entries
      query(`
        SELECT id, trigger, date, blocks_generated, blocks_deconflicted,
               blocks_synced, gcal_deleted, model_used, duration_ms, error, created_at
        FROM plan_log
        ORDER BY created_at DESC
        LIMIT 10
      `),
    ]);

    // Fetch API usage in parallel (graceful if table missing)
    const [usageTotal7, usageTotal30, usageByProvider, usageByModel, usageRecent] = await Promise.allSettled([
      queryOne(`SELECT COALESCE(SUM(cost_usd),0)::float AS cost, COALESCE(SUM(input_tokens+output_tokens),0)::int AS tokens FROM api_usage_log WHERE created_at >= NOW() - INTERVAL '7 days'`),
      queryOne(`SELECT COALESCE(SUM(cost_usd),0)::float AS cost, COALESCE(SUM(input_tokens+output_tokens),0)::int AS tokens FROM api_usage_log WHERE created_at >= NOW() - INTERVAL '30 days'`),
      query(`SELECT provider, COALESCE(SUM(cost_usd),0)::float AS cost, COALESCE(SUM(input_tokens),0)::int AS input_tokens, COALESCE(SUM(output_tokens),0)::int AS output_tokens, COUNT(*)::int AS calls FROM api_usage_log WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY provider ORDER BY cost DESC`),
      query(`SELECT model, provider, COALESCE(SUM(cost_usd),0)::float AS cost, COALESCE(SUM(input_tokens),0)::int AS input_tokens, COALESCE(SUM(output_tokens),0)::int AS output_tokens, COUNT(*)::int AS calls FROM api_usage_log WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY model, provider ORDER BY cost DESC LIMIT 15`),
      query(`SELECT provider, model, endpoint, input_tokens, output_tokens, cost_usd::float AS cost_usd, created_at FROM api_usage_log ORDER BY created_at DESC LIMIT 20`),
    ]);

    const val = (r, fallback = null) => r.status === 'fulfilled' ? r.value : fallback;

    const pillarMap = {};
    for (const row of (val(pillarDist, []))) {
      pillarMap[row.pillar] = parseInt(row.minutes) || 0;
    }

    res.json({
      plans: {
        this_week: val(plansWeek)?.count ?? 0,
        today:     val(plansToday)?.count ?? 0,
        total:     val(plansTotal)?.count ?? 0,
      },
      active_days: {
        last_7:  val(activeDays7)?.count  ?? 0,
        last_30: val(activeDays30)?.count ?? 0,
      },
      pillar_distribution: {
        physical:  pillarMap.physical  ?? 0,
        mental:    pillarMap.mental    ?? 0,
        financial: pillarMap.financial ?? 0,
        spiritual: pillarMap.spiritual ?? 0,
        personal:  pillarMap.personal  ?? 0,
      },
      sync_stats: {
        total_blocks: val(syncStats)?.total_blocks ?? 0,
        gcal_synced:  val(syncStats)?.gcal_synced  ?? 0,
        sync_rate:    val(syncStats)?.sync_rate    ?? 0,
      },
      recent_plans: val(recentPlans, []),
      api_usage: {
        last_7d:  { cost: val(usageTotal7)?.cost ?? 0,  tokens: val(usageTotal7)?.tokens  ?? 0 },
        last_30d: { cost: val(usageTotal30)?.cost ?? 0, tokens: val(usageTotal30)?.tokens ?? 0 },
        by_provider: val(usageByProvider, []),
        by_model:    val(usageByModel, []),
        recent:      val(usageRecent, []),
        pricing:     MODEL_PRICING,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ops/pillars — pillar definitions
router.get('/pillars', async (req, res) => {
  try {
    const pillars = await query(`SELECT * FROM pillars ORDER BY sort_order`);
    res.json(pillars);
  } catch {
    // Fallback if table not yet migrated
    res.json([
      { id: 'physical',  label: 'Physical',  color: '#22C55E', icon: '🏋️', sort_order: 1 },
      { id: 'mental',    label: 'Mental',    color: '#60A5FA', icon: '🧠', sort_order: 2 },
      { id: 'financial', label: 'Financial', color: '#FBBF24', icon: '💰', sort_order: 3 },
      { id: 'spiritual', label: 'Spiritual', color: '#C084FC', icon: '🕊️', sort_order: 4 },
      { id: 'personal',  label: 'Personal',  color: '#94A3B8', icon: '◇',  sort_order: 5 },
    ]);
  }
});

module.exports = router;
