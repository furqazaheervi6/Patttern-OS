const express = require('express');
const router = express.Router();
const {
  fetchRecentPages,
  extractPageContent,
  mapPageToPillarSignals,
  syncAndEnrichAll,
  getCachedFeed,
  getLastSyncTime,
} = require('../services/notionService');
const { queryOne, query } = require('../db/database');

// GET /api/notion/sync — quick page list sync (no content extraction)
router.get('/sync', async (req, res) => {
  try {
    const { all } = await fetchRecentPages(30);
    res.json({ success: true, synced: all.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notion/sync-full — SSE stream: full sync + content + pillar mapping
router.get('/sync-full', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (msg, data = {}) => {
    res.write(`data: ${JSON.stringify({ msg, ...data })}\n\n`);
  };

  try {
    const result = await syncAndEnrichAll((msg) => send('progress', { text: msg }));
    send('done', result);
  } catch (err) {
    send('error', { text: err.message });
  } finally {
    res.end();
  }
});

// GET /api/notion/feed
router.get('/feed', async (req, res) => {
  try {
    const feed = await getCachedFeed(15);
    const lastSync = await getLastSyncTime();
    const parsed = feed.map((item) => ({
      ...item,
      raw_content: item.raw_content ? JSON.parse(item.raw_content) : null,
      parsed_fields: item.parsed_fields ? JSON.parse(item.parsed_fields) : null,
    }));
    res.json({ pages: parsed, last_sync: lastSync });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notion/status
router.get('/status', async (req, res) => {
  const configured = !!(process.env.NOTION_API_KEY && (process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID));
  const lastSync = await getLastSyncTime();

  // Count mapped pages
  const mappedCount = await queryOne(
    'SELECT COUNT(*) as count FROM notion_cache WHERE parsed_fields IS NOT NULL'
  );
  const totalCount = await queryOne('SELECT COUNT(*) as count FROM notion_cache');

  res.json({
    configured,
    last_sync: lastSync,
    mapped_pages: parseInt(mappedCount?.count || 0),
    total_pages: parseInt(totalCount?.count || 0),
  });
});

// POST /api/notion/map/:id — map a single page to pillar signals
router.post('/map/:id', async (req, res) => {
  try {
    const result = await mapPageToPillarSignals(req.params.id);
    if (!result) return res.status(404).json({ error: 'Page not found or no content' });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notion/pillar-summary — aggregated signals across all mapped pages
router.get('/pillar-summary', async (req, res) => {
  try {
    const rows = await query(
      `SELECT page_date, parsed_fields FROM notion_cache
       WHERE parsed_fields IS NOT NULL
       ORDER BY page_date DESC NULLS LAST
       LIMIT 30`
    );

    const summary = { physical: [], mental: [], financial: [], spiritual: [] };
    for (const row of rows) {
      let pf = {};
      try { pf = JSON.parse(row.parsed_fields); } catch {}
      for (const pillar of Object.keys(summary)) {
        if (pf[pillar]?.notes) {
          summary[pillar].push({ date: row.page_date, notes: pf[pillar].notes });
        }
      }
    }

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notion/entries — date + title list, optional ?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/entries', async (req, res) => {
  try {
    const { start, end } = req.query;
    let sql = 'SELECT page_id, page_date, raw_content FROM notion_cache WHERE page_date IS NOT NULL';
    const params = [];
    if (start) { sql += ' AND page_date >= ?'; params.push(start); }
    if (end) { sql += ' AND page_date <= ?'; params.push(end); }
    sql += ' ORDER BY page_date DESC LIMIT 120';
    const rows = await query(sql, params);
    const entries = rows.map(r => {
      let title = 'Journal Entry';
      let url = null;
      try {
        const raw = r.raw_content ? (typeof r.raw_content === 'string' ? JSON.parse(r.raw_content) : r.raw_content) : {};
        if (raw.title) title = raw.title;
        if (raw.url) url = raw.url;
      } catch {}
      // Fallback Notion URL from page_id
      if (!url && r.page_id) url = `https://www.notion.so/${r.page_id.replace(/-/g, '')}`;
      return { date: r.page_date, title, url };
    });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
