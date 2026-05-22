const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db/database');

// GET /api/imports — list import history
router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM imports ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/imports/csv — import check-in data from CSV text
router.post('/csv', async (req, res) => {
  try {
    const { content, filename } = req.body;
    if (!content) return res.status(400).json({ error: 'CSV content is required' });

    const lines = content.trim().split('\n');
    if (lines.length < 2) return res.status(400).json({ error: 'CSV must have a header row and at least one data row' });

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const dateIdx = headers.indexOf('date');
    if (dateIdx === -1) return res.status(400).json({ error: 'CSV must have a "date" column' });

    const CHECKIN_FIELDS = [
      'sleep_hours', 'exercise', 'energy_score', 'nutrition_score',
      'focus_score', 'mood_score', 'stress_score', 'learning',
      'productive_hours', 'milestone_hit', 'revenue_note', 'runway_note',
      'reflection_done', 'purpose_score', 'gratitude_done', 'alignment_score',
      'physical_score', 'mental_score', 'financial_score', 'spiritual_score', 'overall_score',
    ];

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: column count mismatch`);
        skipped++;
        continue;
      }

      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx]; });

      const date = row.date;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.push(`Row ${i + 1}: invalid date "${date}"`);
        skipped++;
        continue;
      }

      // Check if date already exists
      const existing = await queryOne('SELECT id FROM checkins WHERE date = ?', [date]);
      if (existing) {
        skipped++;
        continue;
      }

      // Build insert values
      const fields = ['date'];
      const placeholders = ['?'];
      const params = [date];

      for (const field of CHECKIN_FIELDS) {
        if (row[field] !== undefined && row[field] !== '') {
          fields.push(field);
          placeholders.push('?');
          const val = row[field];
          if (['exercise', 'learning', 'milestone_hit', 'reflection_done', 'gratitude_done'].includes(field)) {
            params.push(val === 'true' || val === '1' || val === 'yes' ? 1 : 0);
          } else if (['revenue_note', 'runway_note'].includes(field)) {
            params.push(val);
          } else {
            params.push(parseFloat(val) || 0);
          }
        }
      }

      await execute(`INSERT INTO checkins (${fields.join(',')}) VALUES (${placeholders.join(',')})`, params);
      imported++;
    }

    // Log import
    const now = new Date().toISOString();
    await execute(
      'INSERT INTO imports (filename, type, size, records_imported, status, notes, created_at) VALUES (?,?,?,?,?,?,?)',
      [filename || 'import.csv', 'csv', content.length, imported, 'complete', errors.length ? errors.join('; ') : null, now]
    );

    res.json({ success: true, imported, skipped, errors: errors.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/imports/goals — import goals from JSON or text
router.post('/goals', async (req, res) => {
  try {
    const { goals } = req.body;
    if (!goals || !Array.isArray(goals)) {
      return res.status(400).json({ error: 'goals array is required' });
    }

    let imported = 0;
    const now = new Date().toISOString();

    for (const g of goals) {
      if (!g.domain || !g.metric) continue;
      await execute(
        'INSERT INTO goals (title, domain, metric, target_value, target_label, description, deadline, priority, category, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [
          g.title || g.metric,
          g.domain,
          g.metric,
          g.target_value || 0,
          g.target_label || null,
          g.description || '',
          g.deadline || null,
          g.priority || 'medium',
          g.category || 'habit',
          now, now,
        ]
      );
      imported++;
    }

    await execute(
      'INSERT INTO imports (filename, type, records_imported, status, created_at) VALUES (?,?,?,?,?)',
      ['goals-import', 'goals', imported, 'complete', now]
    );

    res.json({ success: true, imported });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/imports/text — import freeform text (notes, reflections)
router.post('/text', async (req, res) => {
  try {
    const { content, filename, type } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const now = new Date().toISOString();
    const fname = filename || `text-import-${Date.now()}.txt`;

    // Store content in database instead of filesystem (serverless-compatible)
    await execute(
      'INSERT INTO imports (filename, type, size, records_imported, status, content, created_at) VALUES (?,?,?,?,?,?,?)',
      [fname, type || 'text', content.length, 1, 'stored', content, now]
    );

    res.json({ success: true, filename: fname, size: content.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/imports/file — handle file metadata (actual upload via multipart handled separately)
router.post('/file', async (req, res) => {
  try {
    const { filename, type, size, notes } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename is required' });

    const now = new Date().toISOString();
    await execute(
      'INSERT INTO imports (filename, type, size, status, notes, created_at) VALUES (?,?,?,?,?,?)',
      [filename, type || 'file', size || 0, 'stored', notes || null, now]
    );

    const record = await queryOne('SELECT * FROM imports ORDER BY id DESC LIMIT 1');
    res.json({ success: true, import: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to parse CSV lines respecting quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

module.exports = router;
