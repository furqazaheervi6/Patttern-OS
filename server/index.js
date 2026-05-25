require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// CORS — allow Vercel preview/prod URLs plus local dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o)) || origin.endsWith('.vercel.app')) {
      return cb(null, true);
    }
    cb(null, true); // Permissive for now; tighten after launch
  },
}));
// Stripe webhook needs raw body — mount before json middleware
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '5mb' }));

// ── Routes ───────────────────────────────────────────────
app.use('/api/checkin', require('./routes/checkin'));
app.use('/api/notion', require('./routes/notion'));
app.use('/api/google', require('./routes/google'));
app.use('/api/agent', require('./routes/agent'));
app.use('/api/digest', require('./routes/digest'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/imports', require('./routes/imports'));
app.use('/api/cron', require('./routes/cron'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/calendar', require('./routes/calendarPlan'));
app.use('/api/ops', require('./routes/ops'));
app.use('/api/settings',     require('./routes/settings'));
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/initiatives',  require('./routes/initiatives'));
app.use('/api/billing',      require('./routes/billing'));
app.use('/api/intelligence', require('./routes/intelligence'));
app.use('/api/patterns',     require('./routes/patterns'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  name: 'PatternOS',
  version: '2.0.0',
  env: process.env.VERCEL ? 'vercel' : 'local',
}));

// ── Local development server ─────────────────────────────
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  const { runMigrations } = require('./db/runMigrations');
  runMigrations().then(() => {
    app.listen(PORT, () => {
      console.log(`\n  PatternOS server running at http://localhost:${PORT}`);
      console.log(`  API health: http://localhost:${PORT}/api/health\n`);
      const { startCronJobs } = require('./services/cronJobs');
      startCronJobs();
    });
  }).catch(err => {
    console.error('Migration error:', err.message);
    // Start anyway — migration errors shouldn't block the server
    app.listen(PORT, () => {
      console.log(`\n  PatternOS server running at http://localhost:${PORT}\n`);
    });
  });
}

module.exports = app;
