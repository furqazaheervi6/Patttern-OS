const { Client } = require('@notionhq/client');
const { query, queryOne, execute } = require('../db/database');

function getClient() {
  return new Client({ auth: process.env.NOTION_API_KEY });
}

function getSourceId() {
  return process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;
}

function isPageMode() {
  return !!process.env.NOTION_PAGE_ID && !process.env.NOTION_DATABASE_ID;
}

async function fetchRecentPages(limit = 30) {
  if (!process.env.NOTION_API_KEY || !getSourceId()) return [];

  const notion = getClient();
  try {
    let pages;

    if (isPageMode()) {
      // Page-hierarchy mode: list child pages of the parent page (e.g. Saumvara)
      const blocks = await notion.blocks.children.list({
        block_id: process.env.NOTION_PAGE_ID,
        page_size: 100,
      });
      // Filter to child_page blocks only
      const childPageBlocks = blocks.results.filter((b) => b.type === 'child_page');
      pages = [];
      for (const block of childPageBlocks.slice(0, limit)) {
        try {
          const page = await notion.pages.retrieve({ page_id: block.id });
          pages.push(page);
        } catch {
          pages.push({
            id: block.id,
            created_time: block.created_time,
            url: `https://www.notion.so/${block.id.replace(/-/g, '')}`,
            properties: {},
            _title: block.child_page?.title || 'Untitled',
          });
        }
      }
    } else {
      // Database mode: query the database directly
      const response = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: limit,
      });
      pages = response.results;
    }

    for (const page of pages) {
      const existing = await queryOne('SELECT id FROM notion_cache WHERE page_id = ?', [page.id]);
      if (!existing) {
        const title =
          page._title ||
          page.properties?.title?.title?.[0]?.plain_text ||
          page.properties?.Name?.title?.[0]?.plain_text ||
          'Untitled';
        const dateStr = page.created_time?.split('T')[0] || null;
        // Try to parse date from title format "DD/MM/YYYY - ..."
        const dateMatch = title.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        const parsedDate = dateMatch
          ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
          : dateStr;

        await execute(
          'INSERT INTO notion_cache (page_id, page_date, raw_content, parsed_fields) VALUES (?,?,?,?) ON CONFLICT (page_id) DO NOTHING',
          [page.id, parsedDate, JSON.stringify({ title, url: page.url }), null]
        );
      }
    }

    return pages;
  } catch (err) {
    console.error('Notion fetch error:', err.message);
    return [];
  }
}

async function extractPageContent(pageId) {
  if (!process.env.NOTION_API_KEY) return null;

  const notion = getClient();
  try {
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    const content = { goals: [], notes: [], tasks: [], ideas: [], reflections: [] };
    let currentSection = null;

    for (const block of blocks.results) {
      if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
        const headingText = block[block.type].rich_text?.[0]?.plain_text?.toLowerCase() || '';
        if (headingText.includes('goal')) currentSection = 'goals';
        else if (headingText.includes('note')) currentSection = 'notes';
        else if (headingText.includes('task')) currentSection = 'tasks';
        else if (headingText.includes('idea')) currentSection = 'ideas';
        else if (headingText.includes('reflect')) currentSection = 'reflections';
        else currentSection = 'notes';
      }

      if (['paragraph', 'bulleted_list_item', 'to_do', 'numbered_list_item', 'callout', 'quote'].includes(block.type)) {
        const text = block[block.type].rich_text?.map((r) => r.plain_text).join('') || '';
        if (text.trim()) {
          const section = currentSection || 'notes';
          content[section].push(text.trim());
        }
      }
    }

    return content;
  } catch (err) {
    console.error('Notion page extract error:', err.message);
    return null;
  }
}

async function getCachedFeed(limit = 10) {
  return await query(
    'SELECT page_id, page_date, raw_content, parsed_fields, cached_at FROM notion_cache ORDER BY page_date DESC, cached_at DESC LIMIT ?',
    [limit]
  );
}

async function getLastSyncTime() {
  const row = await queryOne('SELECT cached_at FROM notion_cache ORDER BY cached_at DESC LIMIT 1');
  return row?.cached_at || null;
}

module.exports = { fetchRecentPages, extractPageContent, getCachedFeed, getLastSyncTime };
