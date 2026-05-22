const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../db/database');

const SUPPORTED_INTEGRATIONS = [
  {
    name: 'anthropic',
    type: 'api',
    label: 'Anthropic / Claude',
    description: 'AI-powered weekly digests, pattern alerts, and journal analysis',
    icon: '🧠',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'sk-ant-...' }],
    docs_url: 'https://console.anthropic.com',
  },
  {
    name: 'perplexity',
    type: 'api',
    label: 'Perplexity AI',
    description: 'Research-backed insights and health optimization queries via Sonar API',
    icon: '🔍',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'pplx-...' },
      { key: 'model', label: 'Model', placeholder: 'sonar-pro', default: 'sonar-pro' },
    ],
    docs_url: 'https://docs.perplexity.ai',
  },
  {
    name: 'notion',
    type: 'api',
    label: 'Notion',
    description: 'Journal sync and knowledge base integration',
    icon: '📓',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'secret_...' },
      { key: 'database_id', label: 'Database ID', placeholder: 'Your journal database ID' },
    ],
    docs_url: 'https://developers.notion.com',
  },
  {
    name: 'google_calendar',
    type: 'oauth',
    label: 'Google Calendar',
    description: 'Calendar events and scheduling awareness',
    icon: '📅',
    fields: [],
    docs_url: 'https://console.cloud.google.com',
  },
  {
    name: 'mcp_slashy',
    type: 'mcp',
    label: 'Slashy / MCP',
    description: 'Model Context Protocol servers — connect any MCP-compatible tool or data source',
    icon: '⚡',
    fields: [
      { key: 'server_url', label: 'MCP Server URL', placeholder: 'http://localhost:8080/mcp' },
      { key: 'auth_token', label: 'Auth Token (optional)', placeholder: 'Bearer token or API key' },
    ],
    docs_url: 'https://modelcontextprotocol.io',
  },
  {
    name: 'n8n',
    type: 'webhook',
    label: 'n8n',
    description: 'Workflow automation — trigger n8n flows on check-in, goals, and report events',
    icon: '🔄',
    fields: [
      { key: 'endpoint', label: 'n8n Webhook URL', placeholder: 'https://your-n8n.app/webhook/...' },
      { key: 'api_key', label: 'n8n API Key (optional)', placeholder: 'eyJ...' },
    ],
    docs_url: 'https://docs.n8n.io',
  },
  {
    name: 'webhook',
    type: 'webhook',
    label: 'Custom Webhook',
    description: 'Send daily check-in data to any external endpoint (Zapier, Make, etc.)',
    icon: '🔗',
    fields: [
      { key: 'endpoint', label: 'Webhook URL', placeholder: 'https://hooks.zapier.com/...' },
      { key: 'secret', label: 'Signing Secret (optional)', placeholder: 'whsec_...' },
    ],
    docs_url: null,
  },
];

// GET /api/integrations — list all integrations with their status
router.get('/', async (req, res) => {
  try {
    const saved = await query('SELECT * FROM integrations');
    const savedMap = {};
    for (const s of saved) savedMap[s.name] = s;

    const result = SUPPORTED_INTEGRATIONS.map(def => {
      const stored = savedMap[def.name];
      return {
        ...def,
        enabled: stored?.enabled === 1 || false,
        status: stored?.status || 'unconfigured',
        last_tested: stored?.last_tested || null,
        config: stored?.config ? JSON.parse(stored.config) : {},
        has_key: !!stored?.api_key,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/integrations/:name — update integration config
router.put('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const def = SUPPORTED_INTEGRATIONS.find(i => i.name === name);
    if (!def) return res.status(404).json({ error: 'Unknown integration' });

    const { api_key, endpoint, config, enabled } = req.body;
    const now = new Date().toISOString();

    // Check if exists
    const existing = await queryOne('SELECT * FROM integrations WHERE name = ?', [name]);

    if (existing) {
      await execute(`
        UPDATE integrations SET
          api_key = COALESCE(?, api_key),
          endpoint = COALESCE(?, endpoint),
          config = COALESCE(?, config),
          enabled = COALESCE(?, enabled),
          status = CASE WHEN ? IS NOT NULL THEN 'configured' ELSE status END,
          updated_at = ?
        WHERE name = ?
      `, [
        api_key ?? null,
        endpoint ?? null,
        config ? JSON.stringify(config) : null,
        enabled ?? null,
        api_key ?? null,
        now,
        name
      ]);
    } else {
      await execute(
        'INSERT INTO integrations (name, type, api_key, endpoint, config, enabled, status, updated_at) VALUES (?,?,?,?,?,?,?,?)',
        [name, def.type, api_key || null, endpoint || null, config ? JSON.stringify(config) : '{}', enabled ? 1 : 0, api_key ? 'configured' : 'unconfigured', now]
      );
    }

    const updated = await queryOne('SELECT * FROM integrations WHERE name = ?', [name]);
    res.json({ success: true, integration: { ...def, ...updated, config: JSON.parse(updated.config || '{}') } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/:name/test — test an integration connection
router.post('/:name/test', async (req, res) => {
  try {
    const { name } = req.params;
    const stored = await queryOne('SELECT * FROM integrations WHERE name = ?', [name]);
    const now = new Date().toISOString();

    let result = { success: false, message: 'Unknown integration' };

    switch (name) {
      case 'anthropic': {
        const key = stored?.api_key || process.env.ANTHROPIC_API_KEY;
        if (!key) {
          result = { success: false, message: 'No API key configured' };
        } else {
          try {
            const Anthropic = require('@anthropic-ai/sdk');
            const client = new Anthropic({ apiKey: key });
            await client.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'ping' }],
            });
            result = { success: true, message: 'Claude API connected successfully' };
          } catch (e) {
            result = { success: false, message: e.message };
          }
        }
        break;
      }

      case 'perplexity': {
        const key = stored?.api_key;
        if (!key) {
          result = { success: false, message: 'No API key configured' };
        } else {
          try {
            const config = JSON.parse(stored.config || '{}');
            const model = config.model || 'sonar-pro';
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'ping — respond with "pong" only' }],
                max_tokens: 10,
              }),
            });
            if (response.ok) {
              result = { success: true, message: `Perplexity connected (${model})` };
            } else {
              const err = await response.json();
              result = { success: false, message: err.error?.message || `HTTP ${response.status}` };
            }
          } catch (e) {
            result = { success: false, message: e.message };
          }
        }
        break;
      }

      case 'notion': {
        const key = stored?.api_key || process.env.NOTION_API_KEY;
        if (!key) {
          result = { success: false, message: 'No API key configured' };
        } else {
          try {
            const response = await fetch('https://api.notion.com/v1/users/me', {
              headers: {
                'Authorization': `Bearer ${key}`,
                'Notion-Version': '2022-06-28',
              },
            });
            if (response.ok) {
              const data = await response.json();
              result = { success: true, message: `Connected as ${data.name || 'Notion user'}` };
            } else {
              result = { success: false, message: `HTTP ${response.status}` };
            }
          } catch (e) {
            result = { success: false, message: e.message };
          }
        }
        break;
      }

      case 'mcp_slashy': {
        const config = JSON.parse(stored?.config || '{}');
        const url = stored?.endpoint || config.server_url;
        if (!url) {
          result = { success: false, message: 'No MCP server URL configured' };
        } else {
          try {
            const headers = { 'Content-Type': 'application/json' };
            if (config.auth_token) headers['Authorization'] = `Bearer ${config.auth_token}`;
            const response = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(5000) });
            result = response.ok
              ? { success: true, message: `MCP server reachable at ${url}` }
              : { success: false, message: `Server returned ${response.status}` };
          } catch (e) {
            result = { success: false, message: e.message };
          }
        }
        break;
      }

      case 'webhook': {
        const url = stored?.endpoint;
        if (!url) {
          result = { success: false, message: 'No webhook URL configured' };
        } else {
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: 'test', timestamp: now }),
              signal: AbortSignal.timeout(5000),
            });
            result = { success: true, message: `Webhook responded with ${response.status}` };
          } catch (e) {
            result = { success: false, message: e.message };
          }
        }
        break;
      }

      case 'n8n': {
        const n8nUrl = stored?.endpoint;
        if (!n8nUrl) {
          result = { success: false, message: 'No n8n webhook URL configured' };
        } else {
          try {
            const headers = { 'Content-Type': 'application/json' };
            if (stored?.api_key) headers['Authorization'] = `Bearer ${stored.api_key}`;
            const response = await fetch(n8nUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({ event: 'test', source: 'patternos', timestamp: now }),
              signal: AbortSignal.timeout(5000),
            });
            result = { success: true, message: `n8n responded with HTTP ${response.status}` };
          } catch (e) {
            result = { success: false, message: e.message };
          }
        }
        break;
      }

      case 'google_calendar':
        result = { success: true, message: 'Use the OAuth flow in Settings to connect' };
        break;
    }

    // Update status in DB
    if (stored) {
      await execute(
        'UPDATE integrations SET status = ?, last_tested = ? WHERE name = ?',
        [result.success ? 'connected' : 'error', now, name]
      );
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/perplexity/query — ask Perplexity a question with PatternOS context
router.post('/perplexity/query', async (req, res) => {
  try {
    const stored = await queryOne("SELECT * FROM integrations WHERE name = 'perplexity'");
    if (!stored?.api_key) {
      return res.status(400).json({ error: 'Perplexity API key not configured' });
    }

    const { question, include_context } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    const config = JSON.parse(stored.config || '{}');
    const model = config.model || 'sonar-pro';

    // Build context from recent data if requested
    let systemPrompt = 'You are a health and wellness research assistant for PatternOS, a personal intelligence dashboard that tracks Physical, Mental, Financial, and Spiritual pillars.';

    if (include_context) {
      const recent = await query(
        "SELECT * FROM checkins WHERE date >= (CURRENT_DATE - 7)::text ORDER BY date DESC"
      );
      if (recent.length > 0) {
        systemPrompt += `\n\nThe user's recent 7-day data:\n${JSON.stringify(recent, null, 2)}`;
      }
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stored.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Perplexity request failed' });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'No response';
    const citations = data.citations || [];

    res.json({ answer, citations, model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/webhook/fire — manually fire webhook with today's data
router.post('/webhook/fire', async (req, res) => {
  try {
    const stored = await queryOne("SELECT * FROM integrations WHERE name = 'webhook'");
    if (!stored?.endpoint) {
      return res.status(400).json({ error: 'Webhook URL not configured' });
    }

    const today = new Date().toISOString().split('T')[0];
    const checkin = await queryOne('SELECT * FROM checkins WHERE date = ?', [today]);
    const activities = await query(`
      SELECT da.*, a.name, a.domain, a.impact, a.weight, a.icon
      FROM daily_activities da JOIN activities a ON a.id = da.activity_id
      WHERE da.date = ?
    `, [today]);

    const payload = {
      event: 'daily_checkin',
      date: today,
      checkin,
      activities,
      timestamp: new Date().toISOString(),
    };

    const headers = { 'Content-Type': 'application/json' };
    const config = JSON.parse(stored.config || '{}');
    if (config.secret) {
      headers['X-Webhook-Secret'] = config.secret;
    }

    const response = await fetch(stored.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    res.json({ success: true, status: response.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
