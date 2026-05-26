const postgres = require('postgres');

const connectionString =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  null;

const isServerless = !!process.env.VERCEL;

// Lazy pool — created on first use, not at module load.
// This prevents cold-start timeouts when the DB is slow or unreachable.
let _sql = null;

function getPool() {
  if (_sql) return _sql;
  if (!connectionString) {
    if (!isServerless) {
      console.error('❌ No database connection string found. Set DATABASE_URL in your environment.');
      process.exit(1);
    }
    return null;
  }

  const isSupabase = connectionString.includes('supabase');
  try {
    _sql = postgres(connectionString, {
      max: isServerless ? 3 : 10,
      idle_timeout: isServerless ? 10 : 30,
      connect_timeout: isServerless ? 8 : 15,
      max_lifetime: isServerless ? 60 : 1800,
      ssl: isSupabase ? { rejectUnauthorized: false } : false,
      onnotice: () => {},
    });
    if (!isServerless) console.log('✅ Postgres pool created');
  } catch (err) {
    console.error('❌ Failed to create postgres pool:', err.message);
    return null;
  }
  return _sql;
}

function convertPlaceholders(text) {
  let index = 0;
  return text.replace(/\?/g, () => `$${++index}`);
}

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`DB query timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function query(text, params = []) {
  const sql = getPool();
  if (!sql) throw new Error('Database not available');
  const converted = convertPlaceholders(text);
  const rows = await withTimeout(sql.unsafe(converted, params));
  return Array.from(rows);
}

async function queryOne(text, params = []) {
  const sql = getPool();
  if (!sql) throw new Error('Database not available');
  const converted = convertPlaceholders(text);
  const rows = await withTimeout(sql.unsafe(converted, params));
  return rows.length > 0 ? rows[0] : null;
}

async function execute(text, params = []) {
  const sql = getPool();
  if (!sql) throw new Error('Database not available');
  const converted = convertPlaceholders(text);
  const result = await withTimeout(sql.unsafe(converted, params));
  return result;
}

module.exports = { query, queryOne, execute, getPool };
