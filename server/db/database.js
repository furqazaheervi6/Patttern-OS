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
  if (!process.env.VERCEL) process.exit(1);
}

/**
 * Parse a Postgres connection URL into individual components.
 * Handles both postgres:// and postgresql:// protocols.
 */
function parseConnectionUrl(url) {
  if (!url) return {};
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 5432,
      database: parsed.pathname.replace('/', '') || 'postgres',
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  } catch (err) {
    console.error('❌ Failed to parse DATABASE_URL:', err.message);
    console.error('   Raw URL length:', url.length, 'first 50 chars:', JSON.stringify(url.substring(0, 50)));
    console.error('   Char codes:', Array.from(url.substring(0, 20)).map(c => c.charCodeAt(0)).join(','));
    return {};
  }
}

const isSupabase = connectionString ? connectionString.includes('supabase') : false;
const connParams = parseConnectionUrl(connectionString);

let sql;
try {
  if (connParams.host) {
    sql = postgres({
      host: connParams.host,
      port: connParams.port,
      database: connParams.database,
      username: connParams.username,
      password: connParams.password,
      max: 3,
      idle_timeout: 20,
      ssl: isSupabase ? { rejectUnauthorized: false } : false,
    });
    console.log('✅ Postgres connection configured for:', connParams.host);
  } else if (connectionString) {
    // Fallback: try passing URL directly
    sql = postgres(connectionString, {
      max: 3,
      idle_timeout: 20,
      ssl: isSupabase ? { rejectUnauthorized: false } : false,
    });
  }
} catch (err) {
  console.error('❌ Failed to create postgres connection:', err.message);
}

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
