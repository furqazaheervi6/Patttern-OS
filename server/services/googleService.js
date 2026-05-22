const { google } = require('googleapis');
const { queryOne, execute } = require('../db/database');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

/**
 * Google OAuth for serverless: credentials come from env vars, token stored in DB.
 * Env vars needed: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 * The token is stored in the integrations table under name='google_calendar_token'.
 */

function credentialsExist() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function tokenExists() {
  // This is now async, but we keep the sync interface for the status endpoint
  // by checking an env var fallback. For real checks, use getAuthClient().
  return !!(process.env.GOOGLE_REFRESH_TOKEN);
}

function getRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || (
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/google/auth/callback`
      : 'http://localhost:3001/api/google/auth/callback'
  );
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
}

async function getAuthClient() {
  if (!credentialsExist()) return null;

  const oAuth2Client = createOAuth2Client();

  // Try to get token from env var first (simplest for serverless)
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oAuth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return oAuth2Client;
  }

  // Try to get token from DB
  try {
    const row = await queryOne("SELECT config FROM integrations WHERE name = 'google_calendar_token'");
    if (row?.config) {
      const token = JSON.parse(row.config);
      oAuth2Client.setCredentials(token);

      // Auto-save refreshed tokens
      oAuth2Client.on('tokens', async (tokens) => {
        if (tokens.refresh_token) {
          const merged = { ...token, ...tokens };
          await execute(
            "UPDATE integrations SET config = ?, updated_at = ? WHERE name = 'google_calendar_token'",
            [JSON.stringify(merged), new Date().toISOString()]
          );
        }
      });

      return oAuth2Client;
    }
  } catch {
    // DB not ready or token not found
  }

  return null;
}

function getAuthUrl() {
  if (!credentialsExist()) return null;
  const oAuth2Client = createOAuth2Client();
  return oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
}

async function handleCallback(code) {
  if (!credentialsExist()) throw new Error('Google OAuth not configured');
  const oAuth2Client = createOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);

  // Store token in DB for serverless persistence
  const now = new Date().toISOString();
  const existing = await queryOne("SELECT id FROM integrations WHERE name = 'google_calendar_token'");
  if (existing) {
    await execute(
      "UPDATE integrations SET config = ?, status = 'connected', updated_at = ? WHERE name = 'google_calendar_token'",
      [JSON.stringify(tokens), now]
    );
  } else {
    await execute(
      "INSERT INTO integrations (name, type, config, enabled, status, updated_at) VALUES (?,?,?,?,?,?)",
      ['google_calendar_token', 'oauth', JSON.stringify(tokens), 1, 'connected', now]
    );
  }

  return tokens;
}

async function getUpcomingEvents(days = 7) {
  const auth = await getAuthClient();
  if (!auth) return [];

  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 20,
    });
    return response.data.items || [];
  } catch (err) {
    console.error('Google Calendar error:', err.message);
    return [];
  }
}

async function getEventsForDate(date) {
  const auth = await getAuthClient();
  if (!auth) return [];

  const calendar = google.calendar({ version: 'v3', auth });
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    return response.data.items || [];
  } catch (err) {
    console.error('Google Calendar error:', err.message);
    return [];
  }
}

module.exports = { getUpcomingEvents, getEventsForDate, getAuthUrl, handleCallback, credentialsExist, tokenExists };
