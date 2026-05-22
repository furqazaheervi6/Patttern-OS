const express = require('express');
const router = express.Router();
const { fetchRecentPages, extractPageContent, getCachedFeed, getLastSyncTime } = require('../services/notionService');
const { extractPillarSignalsFromNotion } = require('../services/claudeAgent');
const { queryOne, execute } = require('../db/database');

// GET /api/notion/sync
router.get('/sync', async (req, res) => {
  try {
    const pages = await fetchRecentPages(30);
    res.json({ success: true, synced: pages.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notion/feed
router.get('/feed', async (req, res) => {
  try {
    const feed = await getCachedFeed(10);
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
  res.json({ configured, last_sync: lastSync });
});

// POST /api/notion/map/:id
router.post('/map/:id', async (req, res) => {
  try {
    const pageId = req.params.id;
    const content = await extractPageContent(pageId);
    if (!content) return res.status(404).json({ error: 'Page not found or empty' });

    const cached = await queryOne('SELECT page_date FROM notion_cache WHERE page_id = ?', [pageId]);
    const pageDate = cached?.page_date || new Date().toISOString().split('T')[0];

    const signals = await extractPillarSignalsFromNotion(content, pageDate);
    await execute('UPDATE notion_cache SET parsed_fields = ? WHERE page_id = ?', [JSON.stringify(signals), pageId]);

    res.json({ success: true, signals, pageDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
