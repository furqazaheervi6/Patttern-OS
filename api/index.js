/**
 * Vercel Serverless Entry Point
 * Wraps the Express app with serverless-http for Vercel Functions.
 */
const serverless = require('serverless-http');
const app = require('../server/index');

module.exports = serverless(app);
