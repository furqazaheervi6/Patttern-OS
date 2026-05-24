const { google } = require('googleapis');
const { queryOne, execute } = require('../db/database');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Google OAuth for serverless: credentials come from env vars, token stored in DB.
 * Env vars needed: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 * The token is stored in the integrations table under name='google_calendar_token'.
 */

function credentialsExist() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function tokenExists() {
  return !!(process.env.GOOGLE_REFRESH_TOKEN);
}

async function tokenExistsAsync() {
  if (process.env.GOOGLE_REFRESH_TOKEN) return true;
  try {
    const row = await queryOne("SELECT id FROM integrations WHERE name = 'google_calendar_token' AND config != '{}'");
    return !!row;
  } catch { return false; }
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

async function getEventsInRange(startDate, endDate) {
  const auth = await getAuthClient();
  if (!auth) return [];

  const calendar = google.calendar({ version: 'v3', auth });
  const timeMin = new Date(startDate);
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(endDate);
  timeMax.setHours(23, 59, 59, 999);

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });
    return response.data.items || [];
  } catch (err) {
    console.error('Google Calendar range error:', err.message);
    return [];
  }
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

const PILLAR_COLOR_IDS = { physical: '10', mental: '9', financial: '5', spiritual: '3', personal: '8' };

async function createEvent(eventData) {
  const auth = await getAuthClient();
  if (!auth) throw new Error('Google Calendar not connected');
  const calendar = google.calendar({ version: 'v3', auth });
  const response = await calendar.events.insert({ calendarId: 'primary', requestBody: eventData });
  return response.data;
}

// Convert PatternOS plan block → Google Calendar event object
function planBlockToGCalEvent(block, timeZone = 'America/New_York') {
  const dateStr = block.date; // YYYY-MM-DD
  const startIso = `${dateStr}T${block.start}:00`;
  const endIso   = `${dateStr}T${block.end}:00`;
  const pillarLabel = (block.pillar || 'personal').charAt(0).toUpperCase() + block.pillar.slice(1);
  return {
    summary: `[${pillarLabel}] ${block.title}`,
    description: block.description ? `${pillarLabel} · ${block.description}` : pillarLabel,
    start: { dateTime: startIso, timeZone },
    end:   { dateTime: endIso,   timeZone },
    colorId: PILLAR_COLOR_IDS[block.pillar] || '8',
  };
}

async function createEventsBatch(blocks, timeZone) {
  const results = [];
  for (const block of blocks) {
    try {
      const ev = planBlockToGCalEvent(block, timeZone);
      const created = await createEvent(ev);
      results.push({ success: true, id: created.id, title: block.title, pillar: block.pillar });
    } catch (err) {
      results.push({ success: false, title: block.title, error: err.message });
    }
  }
  return results;
}

module.exports = { getUpcomingEvents, getEventsForDate, getEventsInRange, getAuthUrl, handleCallback, credentialsExist, tokenExists, tokenExistsAsync, createEvent, createEventsBatch, planBlockToGCalEvent };
