const postgres = require('postgres');

const connectionString =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  null;

const isServerless = !!process.env.VERCEL;

let _sql = null;

// Cache a *healthy* check for 30 s (don't re-probe a working DB on every
// request), but only briefly cache an *unhealthy* result so a transient blip
// — e.g. a recycled/dropped pooler connection — self-heals on the next request
// instead of surfacing a full 30 s of "Service temporarily unavailable".
let _dbAvailable = null;
let _dbCheckAt   = 0;
const DB_OK_CACHE_MS   = 30_000;
const DB_FAIL_CACHE_MS = 3_000;

function isNetworkError(err) {
  const msg = err?.message || '';
  return (
    msg.includes('ENOTFOUND') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('connect_timeout') ||
    msg.includes('timed out')
  );
}

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
      connect_timeout: isServerless ? 8 : 2,
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

// Returns true if DB is reachable. Healthy results are cached for 30 s; an
// unhealthy result is rechecked within DB_FAIL_CACHE_MS, and the probe itself
// retries a few times so one transient failure can't lock everyone out.
async function checkDbAvailable() {
  const now = Date.now();
  const cacheWindow = _dbAvailable ? DB_OK_CACHE_MS : DB_FAIL_CACHE_MS;
  if (_dbAvailable !== null && now - _dbCheckAt < cacheWindow) return _dbAvailable;

  const sql = getPool();
  if (!sql) {
    _dbAvailable = false;
    _dbCheckAt = now;
    return false;
  }

  // Retry before condemning the DB — a single failed probe (transient network
  // blip / recycled connection) shouldn't surface as an outage to every caller.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await withTimeout(sql`SELECT 1`, 2500);
      _dbAvailable = true;
      _dbCheckAt = Date.now();
      return true;
    } catch {
      if (attempt < 3) await new Promise(r => setTimeout(r, 200 * attempt));
    }
  }
  _dbAvailable = false;
  _dbCheckAt = Date.now();
  return false;
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
  if (!await checkDbAvailable()) return [];
  const sql = getPool();
  const converted = convertPlaceholders(text);
  try {
    const rows = await withTimeout(sql.unsafe(converted, params));
    return Array.from(rows);
  } catch (err) {
    if (isNetworkError(err)) { _dbAvailable = false; _dbCheckAt = Date.now(); return []; }
    throw err;
  }
}

async function queryOne(text, params = []) {
  if (!await checkDbAvailable()) return null;
  const sql = getPool();
  const converted = convertPlaceholders(text);
  try {
    const rows = await withTimeout(sql.unsafe(converted, params));
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    if (isNetworkError(err)) { _dbAvailable = false; _dbCheckAt = Date.now(); return null; }
    throw err;
  }
}

async function execute(text, params = []) {
  if (!await checkDbAvailable()) return [];
  const sql = getPool();
  const converted = convertPlaceholders(text);
  try {
    const result = await withTimeout(sql.unsafe(converted, params));
    return result;
  } catch (err) {
    if (isNetworkError(err)) { _dbAvailable = false; _dbCheckAt = Date.now(); return []; }
    throw err;
  }
}

function setDbAvailable(val) {
  _dbAvailable = val;
  _dbCheckAt = Date.now();
}

module.exports = { query, queryOne, execute, getPool, checkDbAvailable, setDbAvailable };
