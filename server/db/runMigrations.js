const fs = require('fs');
const path = require('path');
const { getPool } = require('./database');

// Run in order — each file must be safe to re-run (IF NOT EXISTS everywhere)
const MIGRATION_FILES = [
  'migrate-to-supabase.sql',
  'phase1-migration.sql',
  'phase2-migration.sql',
  'auth-migration.sql',
  'phase3-migration.sql',
  'phase4-migration.sql',
  'phase5-migration.sql',
];

// Errors we can safely ignore on re-runs
const IGNORABLE = [
  'already exists',
  'does not exist',
  'duplicate key',
  'multiple primary keys',
];

function isIgnorable(msg) {
  return IGNORABLE.some(s => msg.toLowerCase().includes(s));
}

// Split a SQL file into individual statements, skipping blank lines and comments
function splitStatements(sql) {
  // Handle DO $$ ... $$ blocks as a single statement
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inDollarQuote && trimmed.startsWith('--')) continue; // skip comment lines

    if (trimmed.includes('$$')) inDollarQuote = !inDollarQuote;

    current += line + '\n';

    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt.length > 1) statements.push(stmt);
      current = '';
    }
  }
  if (current.trim().length > 1) statements.push(current.trim());
  return statements;
}

async function runMigrations() {
  const sql = getPool();
  if (!sql) {
    console.warn('⚠️  No DB connection — skipping migrations');
    return;
  }

  console.log('🔄 Running database migrations...');
  let applied = 0;
  let skipped = 0;

  for (const file of MIGRATION_FILES) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const statements = splitStatements(content);

    for (const stmt of statements) {
      try {
        await sql.unsafe(stmt);
        applied++;
      } catch (err) {
        if (isIgnorable(err.message)) {
          skipped++;
        } else {
          console.warn(`  ⚠️  ${file}: ${err.message.slice(0, 120)}`);
        }
      }
    }
  }

  console.log(`✅ Migrations complete — ${applied} applied, ${skipped} already present`);
}

module.exports = { runMigrations };
