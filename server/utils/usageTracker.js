const { execute, queryOne } = require('../db/database');

// Prices in USD per 1 million tokens
const MODEL_PRICING = {
  // Anthropic
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-sonnet-4-20250514':  { input: 3.00,  output: 15.00 },
  'claude-opus-4-7':           { input: 15.00, output: 75.00 },
  // OpenAI
  'gpt-4o':                    { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':               { input: 0.15,  output: 0.60  },
  'o3-mini':                   { input: 1.10,  output: 4.40  },
  // Google Gemini
  'gemini-2.0-flash':          { input: 0.075, output: 0.30  },
  'gemini-1.5-pro':            { input: 1.25,  output: 5.00  },
  // Groq (LPU inference)
  'llama-3.3-70b-versatile':   { input: 0.59,  output: 0.79  },
  'deepseek-r1-distill-llama-70b': { input: 0.75, output: 0.99 },
  // DeepSeek
  'deepseek-chat':             { input: 0.27,  output: 1.10  },
  'deepseek-reasoner':         { input: 0.55,  output: 2.19  },
  // Mistral
  'mistral-large-latest':      { input: 2.00,  output: 6.00  },
  'mistral-small-latest':      { input: 0.10,  output: 0.30  },
  // Kimi / Moonshot
  'moonshot-v1-128k':          { input: 1.00,  output: 3.00  },
  // Qwen
  'qwen-max':                  { input: 0.40,  output: 1.20  },
};

function calcCost(model, inputTokens, outputTokens) {
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

async function logUsage({ provider, model, endpoint, inputTokens = 0, outputTokens = 0 }) {
  try {
    const cost = calcCost(model, inputTokens, outputTokens);
    await execute(
      `INSERT INTO api_usage_log (provider, model, endpoint, input_tokens, output_tokens, cost_usd)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [provider, model, endpoint || null, inputTokens, outputTokens, cost]
    );
  } catch {
    // Graceful — table may not exist until phase 2 migration is run
  }
}

async function getActiveModel(userId = null) {
  try {
    let row = null;
    if (userId) {
      row = await queryOne(
        `SELECT value FROM user_settings WHERE key = 'active_ai_model' AND user_id = $1 LIMIT 1`,
        [userId]
      );
    }
    if (!row) {
      row = await queryOne(`SELECT value FROM user_settings WHERE key = 'active_ai_model' AND user_id IS NULL LIMIT 1`);
    }
    if (row?.value) {
      const v = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      return { provider: v.provider || 'anthropic', model: v.model || 'claude-sonnet-4-6' };
    }
  } catch {}
  return { provider: 'anthropic', model: 'claude-sonnet-4-6' };
}

module.exports = { logUsage, getActiveModel, MODEL_PRICING, calcCost };
