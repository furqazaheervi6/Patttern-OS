const postgres = require('postgres');

const connectionString =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  null;

const isServerless = !!process.env.VERCEL;

let _sql = null;

// Cache DB availability for 30 s to avoid hammering an unreachable host
let _dbAvailable = null;
let _dbCheckAt   = 0;
const DB_CACHE_MS = 30_000;

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

// Returns true if DB is reachable; caches the result for DB_CACHE_MS
async function checkDbAvailable() {
  const now = Date.now();
  if (_dbAvailable !== null && now - _dbCheckAt < DB_CACHE_MS) return _dbAvailable;

  const sql = getPool();
  if (!sql) {
    _dbAvailable = false;
    _dbCheckAt = now;
    return false;
  }

  try {
    await sql`SELECT 1`;
    _dbAvailable = true;
  } catch {
    _dbAvailable = false;
  }
  _dbCheckAt = now;
  return _dbAvailable;
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
