const express = require('express');
const router = express.Router();
const { getUpcomingEvents, getAuthUrl, handleCallback, credentialsExist, tokenExists } = require('../services/googleService');

// GET /api/google/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const events = await getUpcomingEvents(7);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/google/status
router.get('/status', (req, res) => {
  res.json({
    credentials_exist: credentialsExist(),
    authorized: tokenExists(),
  });
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
