/**
 * Database initialization script.
 * For Postgres/Supabase: Run migrate-to-supabase.sql in the Supabase SQL editor.
 * This script is kept for backward compatibility but is no longer needed for Postgres.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

console.log('For Postgres/Supabase, run the SQL in server/db/migrate-to-supabase.sql via the Supabase SQL editor.');
console.log('This init.js script is no longer needed for the Postgres setup.');
process.exit(0);
