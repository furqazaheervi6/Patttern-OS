const express = require('express');
const router = express.Router();
const { getUpcomingEvents, getEventsInRange, getAuthUrl, handleCallback, credentialsExist, tokenExists, tokenExistsAsync, createEvent, createEventsBatch, deleteEvent } = require('../services/googleService');
const { execute } = require('../db/database');

// GET /api/google/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const events = await getUpcomingEvents(7);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/google/events?start=2026-05-01&end=2026-05-31
router.get('/events', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required' });
    const events = await getEventsInRange(start, end);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/google/status
router.get('/status', async (req, res) => {
  res.json({
    credentials_exist: credentialsExist(),
    authorized: await tokenExistsAsync(),
  });
});

// POST /api/google/events — create a single event
router.post('/events', async (req, res) => {
  try {
    const result = await createEvent(req.body);
    res.json({ success: true, event: result });
  } catch (err) {
    const status = err.message?.includes('insufficient') || err.code === 403 ? 403 : 500;
    res.status(status).json({ error: err.message, needs_reauth: status === 403 });
  }
});

// POST /api/google/events/batch — sync plan blocks to Google Calendar
router.post('/events/batch', async (req, res) => {
  try {
    const { events, timeZone = 'America/New_York' } = req.body;
    if (!Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'events array required' });
    const results = await createEventsBatch(events, timeZone);
    const created = results.filter(r => r.success).length;

    // Store gcal_event_id back into calendar_blocks for each successfully synced block
    const syncErrors = [];
    for (const r of results) {
      if (r.success && r.id && r.block_id) {
        try {
          await execute(
            `UPDATE calendar_blocks SET gcal_event_id = ?, gcal_synced_at = NOW() WHERE id = ?`,
            [r.id, r.block_id]
          );
        } catch {}
      }
      if (!r.success) syncErrors.push(r.error || 'unknown error');
    }

    // Update plan_log with sync results (best-effort)
    if (events[0]?.date) {
      try {
        await execute(
          `UPDATE plan_log SET blocks_synced = ?, sync_errors = ?
           WHERE id = (SELECT id FROM plan_log WHERE date = ? ORDER BY created_at DESC LIMIT 1)`,
          [created, JSON.stringify(syncErrors), events[0].date]
        );
      } catch {}
    }

    res.json({ success: true, results, created, total: events.length });
  } catch (err) {
    const status = err.message?.includes('insufficient') || err.code === 403 ? 403 : 500;
    res.status(status).json({ error: err.message, needs_reauth: status === 403 });
  }
});

// DELETE /api/google/events/:eventId — delete a single GCal event
router.delete('/events/:eventId', async (req, res) => {
  try {
    await deleteEvent(req.params.eventId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/google/auth
router.get('/auth', (req, res) => {
  if (!credentialsExist()) {
    return res.status(400).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' });
  }
  const authUrl = getAuthUrl();
  res.redirect(authUrl);
});

// GET /api/google/auth/callback
router.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');
    await handleCallback(code);
    res.send(`
      <html>
        <body style="font-family: sans-serif; background: #0B1120; color: #F8FAFC; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
          <div style="text-align:center;">
            <h2>Google Calendar Connected!</h2>
            <p>You can close this tab and return to PatternOS.</p>
            <script>setTimeout(() => window.close(), 2000);</script>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`Auth failed: ${err.message}`);
  }
});

module.exports = router;
