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

// ─── Block text extraction ─────────────────────────────────────────────────

function richTextToString(richText) {
  if (!Array.isArray(richText)) return '';
  return richText.map(r => r.plain_text || '').join('');
}

async function fetchAllBlocks(notion, blockId, depth = 0) {
  if (depth > 3) return [];
  const blocks = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  const withChildren = [];
  for (const block of blocks) {
    withChildren.push(block);
    if (block.has_children && ['toggle', 'bulleted_list_item', 'numbered_list_item', 'callout', 'quote'].includes(block.type)) {
      try {
        const children = await fetchAllBlocks(notion, block.id, depth + 1);
        withChildren.push(...children);
      } catch {}
    }
  }
  return withChildren;
}

const SECTION_KEYWORDS = {
  physical: ['physical', 'body', 'health', 'exercise', 'sleep', 'energy', 'workout', 'gym', 'nutrition', 'food', 'diet'],
  mental: ['mental', 'mind', 'focus', 'mood', 'stress', 'anxiety', 'cognitive', 'emotional', 'psychology', 'thoughts'],
  financial: ['financial', 'finance', 'money', 'work', 'business', 'revenue', 'productive', 'income', 'wealth', 'career'],
  spiritual: ['spiritual', 'soul', 'gratitude', 'purpose', 'alignment', 'meditation', 'prayer', 'meaning', 'values'],
  goals: ['goal', 'goals', 'objective', 'aim', 'target'],
  tasks: ['task', 'tasks', 'todo', 'to-do', 'action'],
  reflections: ['reflect', 'reflection', 'journal', 'diary', 'thoughts', 'feelings'],
};

function detectSection(headingText) {
  const lower = headingText.toLowerCase();
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return section;
  }
  return 'general';
}

function blocksToContent(blocks) {
  const sections = {
    physical: [], mental: [], financial: [], spiritual: [],
    goals: [], tasks: [], reflections: [], general: [],
  };

  let currentSection = 'general';

  for (const block of blocks) {
    const type = block.type;

    if (['heading_1', 'heading_2', 'heading_3'].includes(type)) {
      const heading = richTextToString(block[type]?.rich_text || []);
      currentSection = detectSection(heading);
      continue;
    }

    const textContent = richTextToString(
      block[type]?.rich_text || block[type]?.title || []
    );

    if (!textContent.trim()) continue;
    const targetSection = sections[currentSection] !== undefined ? currentSection : 'general';
    sections[targetSection].push(textContent.trim());
  }

  const full_text = Object.entries(sections)
    .filter(([, lines]) => lines.length > 0)
    .map(([section, lines]) => `[${section.toUpperCase()}]\n${lines.join('\n')}`)
    .join('\n\n');

  return { sections, full_text };
}

// ─── Page fetching ─────────────────────────────────────────────────────────

async function fetchRecentPages(limit = 30) {
  if (!process.env.NOTION_API_KEY || !getSourceId()) return { all: [], new: [] };

  const notion = getClient();
  try {
    let pages;

    if (isPageMode()) {
      const blocks = await notion.blocks.children.list({
        block_id: process.env.NOTION_PAGE_ID,
        page_size: 100,
      });
      const childPageBlocks = blocks.results.filter(b => b.type === 'child_page');
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
      const response = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: limit,
      });
      pages = response.results;
    }

    const newPages = [];
    for (const page of pages) {
      const title =
        page._title ||
        page.properties?.title?.title?.[0]?.plain_text ||
        page.properties?.Name?.title?.[0]?.plain_text ||
        'Untitled';
      const dateStr = page.created_time?.split('T')[0] || null;
      const dateMatch = title.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      const parsedDate = dateMatch
        ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
        : dateStr;

      const existing = await queryOne(
        'SELECT id, raw_content FROM notion_cache WHERE page_id = $1',
        [page.id]
      );

      if (!existing) {
        await execute(
          `INSERT INTO notion_cache (page_id, page_date, raw_content, parsed_fields)
           VALUES ($1,$2,$3,NULL)
           ON CONFLICT (page_id) DO NOTHING`,
          [page.id, parsedDate, JSON.stringify({ title, url: page.url })]
        );
        newPages.push({ id: page.id, title, date: parsedDate });
      } else {
        let rc = {};
        try { rc = JSON.parse(existing.raw_content || '{}'); } catch {}
        // Re-enrich if no full_text stored yet
        if (!rc.full_text) {
          newPages.push({ id: page.id, title, date: parsedDate });
        }
      }
    }

    return { all: pages, new: newPages };
  } catch (err) {
    console.error('Notion fetch error:', err.message);
    return { all: [], new: [] };
  }
}

// ─── Full content extraction for a single page ────────────────────────────

async function enrichPage(pageId) {
  if (!process.env.NOTION_API_KEY) return null;
  const notion = getClient();

  try {
    const blocks = await fetchAllBlocks(notion, pageId);
    const content = blocksToContent(blocks);

    const cached = await queryOne(
      'SELECT page_id, page_date, raw_content FROM notion_cache WHERE page_id = $1',
      [pageId]
    );
    if (!cached) return null;

    let existingRaw = {};
    try { existingRaw = JSON.parse(cached.raw_content || '{}'); } catch {}

    const updatedRaw = {
      ...existingRaw,
      sections: content.sections,
      full_text: content.full_text,
      block_count: blocks.length,
      enriched_at: new Date().toISOString(),
    };

    await execute(
      'UPDATE notion_cache SET raw_content = $1 WHERE page_id = $2',
      [JSON.stringify(updatedRaw), pageId]
    );

    return { pageId, content, date: cached.page_date };
  } catch (err) {
    console.error(`Notion enrich error for ${pageId}:`, err.message);
    return null;
  }
}

// ─── Map pillar signals for a page and upsert into checkins ───────────────

async function mapPageToPillarSignals(pageId) {
  const row = await queryOne(
    'SELECT page_id, page_date, raw_content FROM notion_cache WHERE page_id = $1',
    [pageId]
  );
  if (!row) return null;

  let rc = {};
  try { rc = JSON.parse(row.raw_content || '{}'); } catch {}
  if (!rc.full_text) return null;

  const { extractAndApplyPillarSignals } = require('./claudeAgent');
  const result = await extractAndApplyPillarSignals(rc.full_text, row.page_date);
  if (!result) return null;

  await execute(
    'UPDATE notion_cache SET parsed_fields = $1 WHERE page_id = $2',
    [JSON.stringify(result.signals), pageId]
  );

  return result;
}

// ─── Main pipeline ─────────────────────────────────────────────────────────

async function syncAndEnrichAll(onProgress) {
  const log = (msg) => {
    console.log(`[Notion Sync] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  log('Fetching pages...');
  const { all, new: newPages } = await fetchRecentPages(30);
  log(`${all.length} pages found, ${newPages.length} need content fetch`);

  // Enrich pages missing full_text
  let enriched = 0;
  for (const page of newPages) {
    try {
      await enrichPage(page.id);
      enriched++;
    } catch (err) {
      log(`Error enriching ${page.id}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  if (enriched) log(`Enriched ${enriched} pages`);

  // Map signals for all pages that have full_text but no parsed_fields
  const toMap = await query(
    `SELECT page_id FROM notion_cache
     WHERE parsed_fields IS NULL
     ORDER BY page_date DESC NULLS LAST
     LIMIT 30`
  );

  let mapped = 0;
  for (const row of toMap) {
    try {
      // Check if content is ready
      const cached = await queryOne('SELECT raw_content FROM notion_cache WHERE page_id = $1', [row.page_id]);
      let rc = {};
      try { rc = JSON.parse(cached?.raw_content || '{}'); } catch {}
      if (!rc.full_text) continue;

      await mapPageToPillarSignals(row.page_id);
      mapped++;
      log(`Mapped signals ${mapped}/${toMap.length}`);
    } catch (err) {
      log(`Error mapping ${row.page_id}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  log(`Sync complete — enriched ${enriched}, mapped ${mapped}`);
  return { enriched, mapped, total: all.length };
}

// ─── Legacy helpers ────────────────────────────────────────────────────────

async function extractPageContent(pageId) {
  const result = await enrichPage(pageId);
  if (!result) return null;
  return result.content.sections;
}

async function getCachedFeed(limit = 10) {
  return await query(
    `SELECT page_id, page_date, raw_content, parsed_fields, cached_at
     FROM notion_cache
     ORDER BY page_date DESC NULLS LAST, cached_at DESC
     LIMIT $1`,
    [limit]
  );
}

async function getLastSyncTime() {
  const row = await queryOne(
    'SELECT cached_at FROM notion_cache ORDER BY cached_at DESC LIMIT 1'
  );
  return row?.cached_at || null;
}

module.exports = {
  fetchRecentPages,
  extractPageContent,
  enrichPage,
  mapPageToPillarSignals,
  syncAndEnrichAll,
  getCachedFeed,
  getLastSyncTime,
};
