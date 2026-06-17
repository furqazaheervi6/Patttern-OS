/**
 * Vercel Serverless Entry Point
 * Exports the Express app directly — Vercel's Node.js runtime handles it natively.
 */
console.log('[API] Loading server...');
const app = require('../server/index');
console.log('[API] Server loaded, exporting handler');

module.exports = app;
