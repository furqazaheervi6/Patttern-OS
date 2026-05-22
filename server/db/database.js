const postgres = require('postgres');

const connectionString =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  null;

if (!connectionString) {
  console.error(
    '❌ No database connection string found.\n' +
    '   Set SUPABASE_DATABASE_URL or DATABASE_URL in your environment.\n' +
    '   Example: DATABASE_URL=postgres://user:pass@localhost:5432/patternos'
  );
  process.exit(1);
}

const isSupabase = connectionString.includes('supabase');

const sql = postgres(connectionString, {
  max: 3,
  idle_timeout: 20,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

/**
 * Convert SQLite-style `?` placeholders to Postgres-style `$1, $2, $3...`
 * so existing route code can keep using `?` placeholders.
 */
function convertPlaceholders(text) {
  let index = 0;
  return text.replace(/\?/g, () => `$${++index}`);
}

/**
 * Run a query and return all matching rows as an array of plain objects.
 * Replaces: db.prepare(sql).all(params)
 */
async function query(text, params = []) {
  const converted = convertPlaceholders(text);
  const rows = await sql.unsafe(converted, params);
  return Array.from(rows);
}

/**
 * Run a query and return the first row, or null if no rows match.
 * Replaces: db.prepare(sql).get(params)
 */
async function queryOne(text, params = []) {
  const converted = convertPlaceholders(text);
  const rows = await sql.unsafe(converted, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute a write statement (INSERT, UPDATE, DELETE).
 * Returns the result object (use `.count` for affected rows).
 * Replaces: db.run(sql, params)
 */
async function execute(text, params = []) {
  const converted = convertPlaceholders(text);
  const result = await sql.unsafe(converted, params);
  return result;
}

/**
 * Return the underlying postgres connection instance for advanced use
 * (transactions, tagged template queries, etc.).
 */
function getPool() {
  return sql;
}

module.exports = { query, queryOne, execute, getPool };
