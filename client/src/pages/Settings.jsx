import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../components/Toast.jsx';
import { localDateStr } from '../utils/formatters.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePushNotifications } from '../hooks/usePushNotifications.js';

// ─── Brand Constants ───────────────────────────────────

const ACCENT_GRADIENT = 'linear-gradient(135deg, #8B0000, #B22222)';
const ACCENT_BG = '#D4D4D8';

// All 7 evolution domains
const DOMAINS = [
  { id: 'physical',  label: 'Physical',  color: '#22C55E', icon: '🏋️', evolution: 'Construction' },
  { id: 'mental',    label: 'Mental',    color: '#60A5FA', icon: '🧠', evolution: 'Kaizen' },
  { id: 'financial', label: 'Financial', color: '#FBBF24', icon: '💰', evolution: '200%' },
  { id: 'spiritual', label: 'Spiritual', color: '#C084FC', icon: '🕊️', evolution: 'Harmony' },
  { id: 'social',    label: 'Social',    color: '#F472B6', icon: '🤝', evolution: 'Humanity' },
  { id: 'purpose',   label: 'Purpose',   color: '#F97316', icon: '🧭', evolution: 'Sojourney' },
  { id: 'awareness', label: 'Awareness', color: '#14B8A6', icon: '👁️', evolution: 'Omnivision' },
];

const PRIORITY_COLORS = { high: '#F87171', medium: '#FBBF24', low: '#64748B' };

// ─── Shared UI ──────────────────────────────────────────

function MaskedInput({ label, value, onChange, placeholder, description }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-xs text-text-muted block mb-1.5 tracking-wide">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 pr-16 rounded-xl border border-border bg-bg text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-teal transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs transition-colors"
        >
          {show ? 'hide' : 'show'}
        </button>
      </div>
      {description && <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{description}</p>}
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, description }) {
  return (
    <div>
      <label className="text-xs text-text-muted block mb-1.5 tracking-wide">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal transition-colors"
      />
      {description && <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{description}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between mb-5 gap-4">
      <div>
        <h3 className="font-display font-semibold text-[15px] text-text-primary tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-md">{subtitle}</p>}
      </div>
      {children && <div className="flex gap-2 shrink-0">{children}</div>}
    </div>
  );
}

function DomainPicker({ value, onChange, columns = 4 }) {
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {DOMAINS.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onChange(d.id)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs border transition-all duration-200 ${
            value === d.id
              ? 'text-text-primary shadow-sm'
              : 'text-text-muted border-border hover:border-text-muted'
          }`}
          style={
            value === d.id
              ? { borderColor: d.color + '50', background: d.color + '10', color: d.color }
              : {}
          }
        >
          <span className="text-sm">{d.icon}</span>
          <span className="truncate">{d.label}</span>
        </button>
      ))}
    </div>
  );
}

function DomainFilter({ value, onChange }) {
  return (
    <div className="flex gap-1.5 mb-5 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
          !value ? 'bg-border text-text-primary' : 'text-text-muted hover:text-text-primary'
        }`}
      >
        All
      </button>
      {DOMAINS.map((d) => (
        <button
          key={d.id}
          onClick={() => onChange(d.id === value ? null : d.id)}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
            value === d.id ? 'border text-text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
          style={
            value === d.id
              ? { borderColor: d.color + '50', background: d.color + '12', color: d.color }
              : {}
          }
        >
          {d.icon} {d.label}
        </button>
      ))}
    </div>
  );
}

function AccentButton({ onClick, disabled, children, variant = 'primary', className = '' }) {
  if (variant === 'ghost') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2.5 rounded-xl text-xs text-text-muted border border-border hover:text-text-primary hover:border-text-muted transition-all duration-200 disabled:opacity-50 ${className}`}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-50 ${className}`}
      style={{ background: ACCENT_GRADIENT, color: ACCENT_BG }}
    >
      {children}
    </button>
  );
}

const TABS = [
  { id: 'integrations', label: 'Integrations', icon: '🔌' },
  { id: 'activities',   label: 'Activities',   icon: '⚡' },
  { id: 'goals',        label: 'Goals',        icon: '🎯' },
  { id: 'reminders',    label: 'Reminders',    icon: '⏰' },
  { id: 'notifications',label: 'Notifications',icon: '🔔' },
  { id: 'billing',      label: 'Billing',      icon: '💳' },
  { id: 'data',         label: 'Data & Import',icon: '💾' },
  { id: 'about',        label: 'About',        icon: '◎' },
];

// ─── Main Settings ──────────────────────────────────────

export default function Settings() {
  const [tab, setTab] = useState('integrations');

  return (
    <div className="page-container settings-page">
      <div className="pl-10 lg:pl-0 mb-5">
        <h1 className="font-display font-bold text-xl text-text-primary tracking-tight">Settings</h1>
        <p className="text-sm text-text-muted mt-1.5">
          Configure your integrations, pillars, goals, and daily rhythm.
        </p>
      </div>

      {/* Tab bar */}
      <div className="settings-tab-list mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`settings-tab-button ${
              tab === t.id
                ? 'settings-tab-button-active'
                : 'settings-tab-button-idle'
            }`}
          >
            <span className="text-sm">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="fade-in">
        {tab === 'integrations' && <IntegrationsTab />}
        {tab === 'activities'   && <ActivitiesTab />}
        {tab === 'goals'        && <GoalsTab />}
        {tab === 'reminders'    && <RemindersTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'billing'      && <BillingTab />}
        {tab === 'data'         && <DataTab />}
        {tab === 'about'        && <AboutTab />}
      </div>
    </div>
  );
}

// ─── Integrations Tab ───────────────────────────────────

const CATEGORY_META = [
  { id: 'ai',           label: 'AI Models',        icon: '🤖', description: 'LLM providers and AI APIs' },
  { id: 'productivity', label: 'Productivity',      icon: '📅', description: 'Calendar, notes, and workflow tools' },
  { id: 'communication',label: 'Communication',     icon: '💬', description: 'Messaging and email' },
  { id: 'fitness',      label: 'Fitness & Health',  icon: '🏃', description: 'Activity and workout tracking' },
  { id: 'automation',   label: 'Automation',        icon: '⚙️', description: 'Webhooks and workflow automation' },
];

function McpServerUrlField({ integ, formData, updateField }) {
  const opts = integ.dropdown_options || [];
  const stored = formData[integ.name]?.server_url || '';
  const presetValues = opts.filter(o => o.value !== 'custom').map(o => o.value);
  const isCustom = stored === 'custom' || (stored && !presetValues.includes(stored));
  const selectVal = isCustom ? 'custom' : (stored || '');

  return (
    <div className="space-y-2">
      <label className="text-xs text-text-muted block tracking-wide">MCP Server URL</label>
      <select
        value={selectVal}
        onChange={(e) => updateField(integ.name, 'server_url', e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:border-teal transition-colors"
      >
        <option value="">— Select a server —</option>
        {opts.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {(selectVal === 'custom' || isCustom) && (
        <input
          type="text"
          value={isCustom && stored !== 'custom' ? stored : ''}
          onChange={(e) => updateField(integ.name, 'server_url', e.target.value)}
          placeholder="https://your-mcp-server.com/mcp"
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal transition-colors"
        />
      )}
    </div>
  );
}

// ─── Model Switcher ─────────────────────────────────────

const PROVIDER_MODELS = {
  anthropic: [
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5',  tier: 'fast',      cost: '$0.80 / $4' },
    { id: 'claude-sonnet-4-6',         label: 'Sonnet 4.6', tier: 'balanced',  cost: '$3 / $15' },
    { id: 'claude-opus-4-7',           label: 'Opus 4.7',   tier: 'powerful',  cost: '$15 / $75' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini', tier: 'fast',     cost: '$0.15 / $0.60' },
    { id: 'gpt-4o',      label: 'GPT-4o',      tier: 'balanced', cost: '$2.50 / $10' },
    { id: 'o3-mini',     label: 'o3-mini',      tier: 'reasoning',cost: '$1.10 / $4.40' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tier: 'fast',    cost: '$0.075 / $0.30' },
    { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro',   tier: 'balanced',cost: '$1.25 / $5' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile',       label: 'Llama 3.3 70B',   tier: 'fast',      cost: '$0.59 / $0.79' },
    { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 70B', tier: 'reasoning', cost: '$0.75 / $0.99' },
  ],
  deepseek: [
    { id: 'deepseek-chat',     label: 'DeepSeek V3', tier: 'balanced',  cost: '$0.27 / $1.10' },
    { id: 'deepseek-reasoner', label: 'DeepSeek R1', tier: 'reasoning', cost: '$0.55 / $2.19' },
  ],
  mistral: [
    { id: 'mistral-large-latest', label: 'Mistral Large', tier: 'balanced', cost: '$2 / $6' },
    { id: 'mistral-small-latest', label: 'Mistral Small', tier: 'fast',     cost: '$0.10 / $0.30' },
  ],
};

const TIER_COLORS = { fast: '#22C55E', balanced: '#60A5FA', powerful: '#C084FC', reasoning: '#FBBF24' };

function ModelSwitcherPanel({ connectedProviders }) {
  const [active, setActive] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    axios.get('/api/settings/active_ai_model').then(r => {
      if (r.data.value) setActive(r.data.value);
      else setActive({ provider: 'anthropic', model: 'claude-sonnet-4-6' });
    }).catch(() => setActive({ provider: 'anthropic', model: 'claude-sonnet-4-6' }));
  }, []);

  const select = async (provider, modelId) => {
    setSaving(true);
    try {
      const val = { provider, model: modelId };
      await axios.put('/api/settings/active_ai_model', { value: val });
      setActive(val);
      toast.success(`Active model → ${modelId}`);
    } catch {
      toast.error('Failed to save model preference');
    } finally {
      setSaving(false);
    }
  };

  if (!active) return null;

  const availableProviders = Object.keys(PROVIDER_MODELS).filter(p =>
    p === 'anthropic' || connectedProviders.includes(p)
  );

  return (
    <div className="card mb-4" style={{ borderColor: 'rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.03)' }}>
      <div className="settings-model-header">
        <div className="min-w-0">
          <p className="text-xs font-display font-semibold text-text-primary uppercase tracking-wider">Active AI Model</p>
          <p className="text-xs text-text-muted mt-0.5">Used for plan generation, chat, and digests</p>
        </div>
        <div className="settings-active-model" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
          <span className="text-xs font-mono text-blue-400">{active.model}</span>
          {saving && <span className="text-xs text-text-muted">saving…</span>}
        </div>
      </div>

      <div className="space-y-3">
        {availableProviders.map(provider => {
          const models = PROVIDER_MODELS[provider] || [];
          const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
          return (
            <div key={provider}>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mb-2 font-mono">{providerLabel}</p>
              <div className="settings-model-grid">
                {models.map(m => {
                  const isActive = active.provider === provider && active.model === m.id;
                  const tierColor = TIER_COLORS[m.tier] || '#64748B';
                  return (
                    <button
                      key={m.id}
                      onClick={() => select(provider, m.id)}
                      disabled={saving}
                      className="flex flex-col gap-1 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 disabled:opacity-50"
                      style={{
                        borderColor: isActive ? tierColor + '60' : '#252540',
                        background:  isActive ? tierColor + '12' : 'rgba(20,20,36,0.5)',
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        {isActive && <span style={{ color: tierColor, fontSize: '0.55rem' }}>◉</span>}
                        <span className="text-xs font-medium text-text-primary">{m.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: tierColor, background: tierColor + '15' }}>{m.tier}</span>
                        <span className="text-[10px] text-text-muted font-mono">{m.cost}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {availableProviders.length < Object.keys(PROVIDER_MODELS).length && (
        <p className="text-[10px] text-text-muted mt-3">
          Connect more AI providers below to unlock additional model options.
        </p>
      )}
    </div>
  );
}

function IntegrationCard({ integ, expanded, onToggle, formData, updateField, handleSave, handleTest, handleDisconnect, testing, disconnecting }) {
  const isOpen = expanded === integ.name;
  const toast = useToast();
  const statusColor =
    integ.status === 'connected' ? '#22C55E'
    : integ.status === 'configured' ? '#FBBF24'
    : integ.status === 'error' ? '#F87171'
    : '#64748B';
  const isConnected = integ.status === 'connected' || integ.status === 'configured';

  return (
    <div className="card">
      <button className="w-full flex items-center justify-between" onClick={() => onToggle(integ.name)}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{integ.icon}</span>
          <div className="text-left">
            <p className="font-display font-semibold text-sm text-text-primary">{integ.label}</p>
            <p className="text-xs text-text-muted leading-relaxed">{integ.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs px-2.5 py-1 rounded-lg border"
            style={{ color: statusColor, borderColor: statusColor + '30', background: statusColor + '08' }}
          >
            {integ.status}
          </span>
          <span className="text-text-muted transition-transform duration-200" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
        </div>
      </button>

      {isOpen && (
        <div className="mt-5 pt-5 border-t border-border space-y-4 fade-in">
          {/* Fields — MCP server_url gets special dropdown treatment */}
          {integ.fields.map((field) => {
            if (integ.name === 'mcp_slashy' && field.key === 'server_url') {
              return <McpServerUrlField key={field.key} integ={integ} formData={formData} updateField={updateField} />;
            }
            const isSecret = field.key.includes('key') || field.key.includes('token') || field.key.includes('secret') || field.key.includes('password');
            const Component = isSecret ? MaskedInput : TextInput;
            return (
              <Component key={field.key} label={field.label} value={formData[integ.name]?.[field.key] || ''} onChange={(v) => updateField(integ.name, field.key, v)} placeholder={field.placeholder} />
            );
          })}

          {/* Per-integration setup hints */}
          {integ.name === 'google_calendar' && (
            <div className="space-y-3">
              <div className="text-xs text-text-muted space-y-1.5 leading-relaxed">
                <p>1. Enable Google Calendar API at <span className="text-teal">console.cloud.google.com</span></p>
                <p>2. Create OAuth 2.0 credentials (Desktop app)</p>
                <p>3. Download as <code className="text-teal">credentials.json</code> to project root</p>
                <p>4. Click below to authorize</p>
              </div>
              <a href="/api/google/auth" target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2.5 rounded-xl text-xs text-teal border border-teal/30 hover:bg-teal/10 transition-colors">
                Connect Google Calendar
              </a>
            </div>
          )}

          {integ.name === 'perplexity' && <PerplexityQuery />}

          {integ.name === 'n8n' && (
            <div className="space-y-3">
              <div className="px-4 py-3.5 rounded-xl bg-border/20 border border-border">
                <p className="text-xs text-text-muted leading-relaxed">
                  n8n receives PatternOS events (check-ins, goal completions, reports) as webhook payloads.
                  Create a Webhook trigger node in n8n and paste the URL above.
                </p>
                <p className="text-xs text-text-muted mt-2">Events sent: <span className="text-teal">daily_checkin</span>, <span className="text-teal">goal_completed</span>, <span className="text-teal">report_generated</span></p>
              </div>
              <AccentButton variant="ghost" onClick={async () => {
                try {
                  const r = await axios.post('/api/integrations/n8n/test');
                  if (r.data.success) toast.success(r.data.message);
                  else toast.error(r.data.message);
                } catch (err) {
                  toast.error(err.response?.data?.error || 'Failed');
                }
              }}>
                Send Test Event
              </AccentButton>
            </div>
          )}

          {integ.name === 'mcp_slashy' && (
            <div className="px-4 py-3.5 rounded-xl bg-border/20 border border-border space-y-2">
              <p className="text-xs text-text-muted leading-relaxed">
                Connect any MCP-compatible tool or data source. PatternOS will route context requests through the server.
              </p>
              {integ.docs_url && <a href={integ.docs_url} target="_blank" rel="noreferrer" className="text-xs text-teal block">↗ Browse MCP ecosystem</a>}
            </div>
          )}

          {integ.name === 'webhook' && (
            <div className="space-y-3">
              <div className="px-4 py-3.5 rounded-xl bg-border/20 border border-border">
                <p className="text-xs text-text-muted leading-relaxed">
                  Sends a POST with your daily check-in data + logged activities as JSON. Compatible with Zapier, Make, or any webhook receiver.
                </p>
              </div>
              <AccentButton variant="ghost" onClick={async () => {
                try {
                  const r = await axios.post('/api/integrations/webhook/fire');
                  toast.success(`Webhook fired — HTTP ${r.data.status}`);
                } catch (err) {
                  toast.error(err.response?.data?.error || 'Failed');
                }
              }}>
                Fire Test Webhook
              </AccentButton>
            </div>
          )}

          {integ.name === 'gmail' && (
            <div className="px-4 py-3.5 rounded-xl bg-border/20 border border-border space-y-2">
              <p className="text-xs text-text-muted font-semibold">Setup — Gmail App Password</p>
              <p className="text-xs text-text-muted leading-relaxed">1. Google Account → Security → 2-Step Verification → App Passwords</p>
              <p className="text-xs text-text-muted leading-relaxed">2. Create app password for "Mail" on "Other Device"</p>
              <p className="text-xs text-text-muted leading-relaxed">3. Paste the 16-character password above</p>
              {integ.docs_url && <a href={integ.docs_url} target="_blank" rel="noreferrer" className="text-xs text-teal block">↗ Open App Passwords page</a>}
            </div>
          )}

          {integ.name === 'imessage' && (
            <div className="px-4 py-3.5 rounded-xl bg-border/20 border border-border space-y-2">
              <p className="text-xs text-text-muted font-semibold">Setup — BlueBubbles (macOS)</p>
              <p className="text-xs text-text-muted leading-relaxed">1. Install BlueBubbles on your Mac — it bridges iMessage to a REST API</p>
              <p className="text-xs text-text-muted leading-relaxed">2. Start the server and note the URL (default: http://localhost:1234)</p>
              <p className="text-xs text-text-muted leading-relaxed">3. Enter your server password above</p>
              {integ.docs_url && <a href={integ.docs_url} target="_blank" rel="noreferrer" className="text-xs text-teal block">↗ Download BlueBubbles</a>}
            </div>
          )}

          {integ.name === 'strava' && (
            <div className="px-4 py-3.5 rounded-xl bg-border/20 border border-border space-y-2">
              <p className="text-xs text-text-muted font-semibold">Setup — Strava API</p>
              <p className="text-xs text-text-muted leading-relaxed">1. Go to <span className="text-teal">strava.com/settings/api</span> and create an app</p>
              <p className="text-xs text-text-muted leading-relaxed">2. Set Authorization Callback Domain to <code className="text-teal">localhost</code></p>
              <p className="text-xs text-text-muted leading-relaxed">3. Copy Client ID and Client Secret above, then click Test Connection to complete OAuth</p>
              {integ.docs_url && <a href={integ.docs_url} target="_blank" rel="noreferrer" className="text-xs text-teal block">↗ Strava API docs</a>}
            </div>
          )}

          {/* Generic AI model hint with docs link */}
          {integ.category === 'ai' && !['anthropic', 'openai', 'perplexity', 'ollama'].includes(integ.name) && integ.docs_url && (
            <div className="flex items-center gap-2">
              <a href={integ.docs_url} target="_blank" rel="noreferrer" className="text-xs text-teal hover:underline">↗ Get API key</a>
            </div>
          )}
          {integ.name === 'ollama' && (
            <div className="px-4 py-3.5 rounded-xl bg-border/20 border border-border space-y-1.5">
              <p className="text-xs text-text-muted leading-relaxed">Run <code className="text-teal">ollama serve</code> locally, then enter the URL above (default: http://localhost:11434).</p>
              {integ.docs_url && <a href={integ.docs_url} target="_blank" rel="noreferrer" className="text-xs text-teal block">↗ Download Ollama</a>}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            {integ.fields.length > 0 && (
              <AccentButton onClick={() => handleSave(integ.name)}>Save</AccentButton>
            )}
            <AccentButton variant="ghost" onClick={() => handleTest(integ.name)} disabled={testing === integ.name}>
              {testing === integ.name ? 'Testing...' : 'Test Connection'}
            </AccentButton>
            {isConnected && (
              <button
                onClick={() => handleDisconnect(integ.name)}
                disabled={disconnecting === integ.name}
                className="ml-auto px-3 py-2 rounded-xl text-xs border transition-all duration-200 disabled:opacity-50"
                style={{ color: '#F87171', borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.06)' }}
              >
                {disconnecting === integ.name ? 'Disconnecting…' : '⊗ Disconnect'}
              </button>
            )}
            {integ.last_tested && !isConnected && (
              <span className="text-xs text-text-muted font-mono ml-auto">
                Last tested: {new Date(integ.last_tested).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IntegrationsTab() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [openCategories, setOpenCategories] = useState({ ai: true, productivity: true, communication: false, fitness: false, automation: false });
  const [formData, setFormData] = useState({});
  const [testing, setTesting] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);
  const toast = useToast();

  useEffect(() => {
    axios.get('/api/integrations').then((r) => {
      setIntegrations(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (name) => {
    try {
      const data = formData[name] || {};
      const payload = {};
      const integ = integrations.find((i) => i.name === name);
      if (!integ) return;

      for (const field of integ.fields) {
        if (field.key === 'api_key' && data[field.key]) {
          payload.api_key = data[field.key];
        } else if (field.key === 'endpoint' || field.key === 'server_url') {
          payload.endpoint = data[field.key] || data.endpoint;
        } else if (data[field.key]) {
          if (!payload.config) payload.config = {};
          payload.config[field.key] = data[field.key];
        }
      }
      payload.enabled = data.enabled !== undefined ? data.enabled : true;

      await axios.put(`/api/integrations/${name}`, payload);
      toast.success(`${integ.label} settings saved`);
      const r = await axios.get('/api/integrations');
      setIntegrations(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleTest = async (name) => {
    setTesting(name);
    try {
      const r = await axios.post(`/api/integrations/${name}/test`);
      if (r.data.success) toast.success(r.data.message);
      else toast.error(r.data.message);
      const updated = await axios.get('/api/integrations');
      setIntegrations(updated.data);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setTesting(null);
    }
  };

  const updateField = (name, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: { ...(prev[name] || {}), [key]: value },
    }));
  };

  const handleDisconnect = async (name) => {
    setDisconnecting(name);
    try {
      await axios.delete(`/api/integrations/${name}`);
      const r = await axios.get('/api/integrations');
      setIntegrations(r.data);
      setExpanded(null);
      toast.success(`${name} disconnected`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to disconnect');
    } finally {
      setDisconnecting(null);
    }
  };

  const toggleCategory = (id) => setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleInteg = (name) => setExpanded(prev => prev === name ? null : name);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-20" />)}
      </div>
    );
  }

  const connectedAiProviders = integrations
    .filter(i => i.category === 'ai' && (i.status === 'connected' || i.status === 'configured'))
    .map(i => i.name);

  return (
    <div className="space-y-5">
      {CATEGORY_META.map((cat) => {
        const catIntegrations = integrations.filter(i => i.category === cat.id);
        if (catIntegrations.length === 0) return null;
        const connectedCount = catIntegrations.filter(i => i.status === 'connected' || i.status === 'configured').length;
        const isOpen = openCategories[cat.id];

        return (
          <div key={cat.id}>
            <button
              className="w-full flex items-center justify-between px-1 py-2 mb-3 group"
              onClick={() => toggleCategory(cat.id)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base">{cat.icon}</span>
                <div className="settings-category-copy">
                  <span className="font-display font-semibold text-sm text-text-primary">{cat.label}</span>
                  <span className="text-xs text-text-muted">{cat.description}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                {connectedCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: '#22C55E', background: '#22C55E14' }}>
                    {connectedCount} active
                  </span>
                )}
                <span className="text-xs text-text-muted">{catIntegrations.length}</span>
                <span className="text-text-muted transition-transform duration-200" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
              </div>
            </button>

            {isOpen && (
              <div className="space-y-2.5 fade-in">
                {cat.id === 'ai' && (
                  <ModelSwitcherPanel connectedProviders={connectedAiProviders} />
                )}
                {catIntegrations.map((integ) => (
                  <IntegrationCard
                    key={integ.name}
                    integ={integ}
                    expanded={expanded}
                    onToggle={toggleInteg}
                    formData={formData}
                    updateField={updateField}
                    handleSave={handleSave}
                    handleTest={handleTest}
                    handleDisconnect={handleDisconnect}
                    testing={testing}
                    disconnecting={disconnecting}
                  />
                ))}
              </div>
            )}

            <div className="h-px bg-border/40 mt-5" />
          </div>
        );
      })}
    </div>
  );
}

// ─── Perplexity Query Widget ────────────────────────────

function PerplexityQuery() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const toast = useToast();

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const r = await axios.post('/api/integrations/perplexity/query', { question: question.trim(), include_context: includeContext });
      setAnswer(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-xl bg-border/15 border border-border">
      <p className="text-xs text-text-muted uppercase tracking-wider">Quick Research</p>
      <div className="flex gap-2">
        <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="Ask Perplexity something..." className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal transition-colors" />
        <AccentButton onClick={ask} disabled={loading || !question.trim()}>
          {loading ? '...' : 'Ask'}
        </AccentButton>
      </div>
      <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
        <input type="checkbox" checked={includeContext} onChange={(e) => setIncludeContext(e.target.checked)} className="rounded" />
        Include my recent PatternOS data as context
      </label>
      {answer && (
        <div className="mt-3 p-4 rounded-xl bg-surface border border-border text-sm text-text-primary whitespace-pre-wrap leading-relaxed glow-teal">
          {answer.answer}
          {answer.citations?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-text-muted mb-1">Sources:</p>
              {answer.citations.map((c, i) => <p key={i} className="text-xs text-teal truncate">{c}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Goals Tab ──────────────────────────────────────────

function GoalsTab() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [filterDomain, setFilterDomain] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const toast = useToast();

  const fetchGoals = useCallback(async () => {
    try {
      let url = '/api/goals?';
      if (filterDomain) url += `domain=${filterDomain}&`;
      if (showCompleted) url += 'include_completed=1';
      const r = await axios.get(url);
      setGoals(r.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [filterDomain, showCompleted]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const broadcastGoalsUpdate = () => window.dispatchEvent(new CustomEvent('patternos:goals_updated'));

  const deleteGoal = async (id) => {
    try {
      await axios.delete(`/api/goals/${id}`);
      toast.success('Goal removed');
      fetchGoals();
      broadcastGoalsUpdate();
    } catch {
      toast.error('Failed to remove goal');
    }
  };

  const completeGoal = async (id) => {
    try {
      await axios.post(`/api/goals/${id}/complete`);
      toast.success('Goal completed!');
      fetchGoals();
      broadcastGoalsUpdate();
    } catch {
      toast.error('Failed to complete goal');
    }
  };

  const updateProgress = async (id, value) => {
    try {
      await axios.post(`/api/goals/${id}/progress`, { value });
      fetchGoals();
      broadcastGoalsUpdate();
    } catch {
      toast.error('Failed to update progress');
    }
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <div>
      <SectionHeader title="Goals" subtitle="Set targets across all seven pillars and track progress over time.">
        <AccentButton variant="ghost" onClick={() => setShowImport(true)}>Import</AccentButton>
        <AccentButton onClick={() => setShowAdd(true)}>+ Add Goal</AccentButton>
      </SectionHeader>

      {/* Domain filter */}
      <DomainFilter value={filterDomain} onChange={setFilterDomain} />
      <div className="flex justify-end mb-4 -mt-2">
        <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} className="rounded" />
          Show completed
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="card animate-pulse h-24" />)}</div>
      ) : activeGoals.length === 0 && !showCompleted ? (
        <div className="card text-center py-12">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(20, 184, 166, 0.1)' }}>
            <span className="text-2xl">🎯</span>
          </div>
          <p className="text-sm text-text-primary font-display font-medium">No active goals yet</p>
          <p className="text-xs text-text-muted mt-1.5">Add a goal to start tracking your progress across all pillars.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onDelete={deleteGoal} onComplete={completeGoal} onProgress={updateProgress} />
          ))}

          {showCompleted && completedGoals.length > 0 && (
            <>
              <div className="flex items-center gap-3 pt-6 pb-2">
                <div className="h-px flex-1 bg-border" />
                <p className="text-xs text-text-muted uppercase tracking-wider">Completed ({completedGoals.length})</p>
                <div className="h-px flex-1 bg-border" />
              </div>
              {completedGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onDelete={deleteGoal} completed />
              ))}
            </>
          )}
        </div>
      )}

      {showAdd && <AddGoalModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchGoals(); }} />}
      {showImport && <ImportGoalsModal onClose={() => setShowImport(false)} onSaved={() => { setShowImport(false); fetchGoals(); }} />}
    </div>
  );
}

function GoalCard({ goal, onDelete, onComplete, onProgress, completed }) {
  const [progressVal, setProgressVal] = useState(goal.current_value || 0);
  const domain = DOMAINS.find(d => d.id === goal.domain);
  const progress = goal.target_value > 0 ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)) : 0;

  return (
    <div className={`card group ${completed ? 'opacity-50' : ''}`} style={{ borderColor: domain?.color + '15' }}>
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: (domain?.color || '#64748B') + '12' }}>
          <span className="text-base">{domain?.icon || '🎯'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-display font-semibold text-text-primary truncate">{goal.title || goal.metric}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ color: PRIORITY_COLORS[goal.priority] || '#64748B', background: (PRIORITY_COLORS[goal.priority] || '#64748B') + '12' }}>
              {goal.priority}
            </span>
            {completed && <span className="text-[10px] text-physical px-2 py-0.5 rounded-md bg-physical/10">done</span>}
          </div>
          {goal.description && <p className="text-xs text-text-muted mb-2.5 leading-relaxed">{goal.description}</p>}

          {/* Progress bar */}
          {goal.target_value > 0 && (
            <div className="mb-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-text-muted">{goal.current_value || 0} / {goal.target_value} {goal.target_label || ''}</span>
                <span className="text-xs font-mono font-medium" style={{ color: domain?.color }}>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, backgroundColor: domain?.color || '#14B8A6' }} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="font-medium" style={{ color: domain?.color }}>{domain?.label}</span>
            {goal.deadline && <span>Due: {goal.deadline}</span>}
            {goal.category && <span className="px-2 py-0.5 rounded-md bg-border/50 text-[10px]">{goal.category}</span>}
          </div>
        </div>

        {/* Actions */}
        {!completed && (
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {goal.target_value > 0 && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={progressVal}
                  onChange={(e) => setProgressVal(parseFloat(e.target.value) || 0)}
                  className="w-14 px-1 py-1 rounded-lg border border-border bg-bg text-xs font-mono text-text-primary text-center"
                  onKeyDown={(e) => e.key === 'Enter' && onProgress?.(goal.id, progressVal)}
                />
                <button onClick={() => onProgress?.(goal.id, progressVal)} className="text-xs text-teal hover:underline">set</button>
              </div>
            )}
            <button onClick={() => onComplete?.(goal.id)} className="text-physical hover:underline text-xs ml-2">✓</button>
            <button onClick={() => onDelete(goal.id)} className="text-text-muted hover:text-red-400 text-xs transition-colors">×</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddGoalModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '', domain: 'physical', metric: '', target_value: 0,
    target_label: '', description: '', deadline: '', priority: 'medium', category: 'habit',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() && !form.metric.trim()) {
      toast.error('Title or metric is required');
      return;
    }
    setSaving(true);
    try {
      await axios.post('/api/goals', { ...form, metric: form.metric || form.title });
      toast.success('Goal added!');
      window.dispatchEvent(new CustomEvent('patternos:goals_updated'));
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,14,28,0.92)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl slide-up p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-text-primary text-base">Add Goal</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl transition-colors">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <TextInput label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g. Run 5K, Read 12 books" />
          <TextInput label="Metric (what you're measuring)" value={form.metric} onChange={(v) => setForm({ ...form, metric: v })} placeholder="e.g. distance_km, books_read" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1.5">Target Value</label>
              <input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: parseFloat(e.target.value) || 0 })} className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:border-teal" step="any" />
            </div>
            <TextInput label="Unit Label" value={form.target_label} onChange={(v) => setForm({ ...form, target_label: v })} placeholder="km, books, hours" />
          </div>

          <div>
            <label className="text-xs text-text-muted block mb-2.5">Domain</label>
            <DomainPicker value={form.domain} onChange={(v) => setForm({ ...form, domain: v })} columns={4} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary">
                <option value="habit">Habit</option>
                <option value="milestone">Milestone</option>
                <option value="project">Project</option>
                <option value="health">Health</option>
                <option value="learning">Learning</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1.5">Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary" />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted block mb-1.5">Description (optional)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Why this goal matters to you..." rows={2} className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal resize-none" />
          </div>

          <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all duration-200 disabled:opacity-50" style={{ background: ACCENT_GRADIENT, color: ACCENT_BG }}>
            {saving ? 'Adding...' : 'Add Goal'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ImportGoalsModal({ onClose, onSaved }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleImport = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      let goals;
      try {
        goals = JSON.parse(text);
        if (!Array.isArray(goals)) goals = [goals];
      } catch {
        goals = text.trim().split('\n').filter(l => l.trim()).map(line => {
          const match = line.match(/^(\w+)\s*:\s*(.+?)(?:\s*\((\d+)\s*(.*?)\))?$/);
          if (match) {
            return { domain: match[1].toLowerCase(), metric: match[2].trim(), title: match[2].trim(), target_value: parseFloat(match[3]) || 0, target_label: match[4]?.trim() || '' };
          }
          return { domain: 'physical', metric: line.trim(), title: line.trim(), target_value: 0 };
        });
      }
      const r = await axios.post('/api/imports/goals', { goals });
      toast.success(`Imported ${r.data.imported} goals`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,14,28,0.92)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl slide-up p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-text-primary text-base">Import Goals</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl transition-colors">×</button>
        </div>
        <p className="text-xs text-text-muted mb-3 leading-relaxed">
          Paste goals as JSON or simple text format: <code className="text-teal">domain: title (target unit)</code>
        </p>
        <div className="bg-bg rounded-xl p-3.5 mb-4 text-xs font-mono text-text-muted space-y-0.5 border border-border/50">
          <p>physical: Run 5K (5 km)</p>
          <p>mental: Read 12 books (12 books)</p>
          <p>financial: Save $5000 (5000 dollars)</p>
          <p>spiritual: Meditate 30 days (30 days)</p>
          <p>social: Host 4 dinners (4 events)</p>
          <p>purpose: Write mission statement (1 document)</p>
          <p>awareness: Journal 90 days (90 entries)</p>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Paste goals here..." className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal resize-none mb-4" />
        <button onClick={handleImport} disabled={saving || !text.trim()} className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all duration-200 disabled:opacity-50" style={{ background: ACCENT_GRADIENT, color: ACCENT_BG }}>
          {saving ? 'Importing...' : 'Import Goals'}
        </button>
      </div>
    </div>
  );
}

// ─── Reminders Tab ──────────────────────────────────────

const REMINDER_TYPES = [
  { id: 'checkin', label: 'Daily Check-In', icon: '📋' },
  { id: 'report', label: 'Evolution Report', icon: '📊' },
  { id: 'goal', label: 'Goal Progress', icon: '🎯' },
  { id: 'digest', label: 'Weekly Digest', icon: '✦' },
  { id: 'custom', label: 'Custom', icon: '🔔' },
];

const INTEGRATION_OPTIONS = [
  { id: null, label: 'None (internal only)' },
  { id: 'notion', label: 'Notion' },
  { id: 'google_calendar', label: 'Google Calendar' },
  { id: 'webhook', label: 'Webhook' },
  { id: 'n8n', label: 'n8n' },
  { id: 'mcp_slashy', label: 'Slashy / MCP' },
  { id: 'perplexity', label: 'Perplexity' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function RemindersTab() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [reportDate, setReportDate] = useState(localDateStr());
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState([]);
  const toast = useToast();

  const fetchReminders = useCallback(async () => {
    try {
      const r = await axios.get('/api/reminders');
      setReminders(r.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  useEffect(() => {
    axios.get(`/api/reports?date=${reportDate}`).then(r => setReports(r.data)).catch(() => {});
  }, [reportDate]);

  const toggleReminder = async (id) => {
    try {
      await axios.post(`/api/reminders/${id}/toggle`);
      fetchReminders();
    } catch {
      toast.error('Failed to toggle');
    }
  };

  const deleteReminder = async (id) => {
    try {
      await axios.delete(`/api/reminders/${id}`);
      toast.success('Reminder deleted');
      fetchReminders();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const generateReports = async () => {
    setGenerating(true);
    try {
      const r = await axios.post('/api/reports/generate', { date: reportDate });
      toast.success(`Generated ${r.data.reports.length} reports`);
      const updated = await axios.get(`/api/reports?date=${reportDate}`);
      setReports(updated.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Scheduled Reminders */}
      <div>
        <SectionHeader title="Scheduled Reminders" subtitle="Set up daily reminders for check-ins, reports, and goal tracking. Connect with your integrations.">
          <AccentButton onClick={() => setShowAdd(true)}>+ Add Reminder</AccentButton>
        </SectionHeader>

        {loading ? (
          <div className="card animate-pulse h-20" />
        ) : reminders.length === 0 ? (
          <div className="card text-center py-10">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <span className="text-2xl">⏰</span>
            </div>
            <p className="text-sm text-text-primary font-display font-medium">No reminders set up yet</p>
            <p className="text-xs text-text-muted mt-1.5">Create your first reminder to build consistency.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.map((r) => {
              const type = REMINDER_TYPES.find(t => t.id === r.type);
              const days = (r.days || '').split(',');
              return (
                <div key={r.id} className="card flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                    <span className="text-base">{type?.icon || '🔔'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold text-text-primary">{r.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                      <span className="text-teal font-medium">{r.time}</span>
                      <span className="text-border">·</span>
                      <span>{days.map(d => DAY_LABELS[parseInt(d) - 1] || d).join(', ')}</span>
                      {r.integration && (
                        <>
                          <span className="text-border">·</span>
                          <span className="text-violet">{r.integration}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={() => toggleReminder(r.id)} className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${r.enabled ? 'bg-teal' : 'bg-border'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${r.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <button onClick={() => deleteReminder(r.id)} className="text-text-muted hover:text-red-400 text-sm transition-colors">×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="h-px bg-border" />

      {/* Daily Evolution Reports */}
      <div>
        <SectionHeader title="Daily Evolution Reports" subtitle="Generate insight reports across all 7 evolution categories.">
          <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="px-3 py-2 rounded-xl border border-border bg-bg text-xs text-text-primary" />
          <AccentButton onClick={generateReports} disabled={generating}>
            {generating ? 'Generating...' : 'Generate'}
          </AccentButton>
        </SectionHeader>

        {reports.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {reports.map((report) => {
              const domain = DOMAINS.find(d => d.id === report.category);
              let scoreData = null;
              try { scoreData = JSON.parse(report.scores); } catch {}

              return (
                <details key={report.id} className="card group">
                  <summary className="cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: (domain?.color || '#64748B') + '12' }}>
                        <span className="text-sm">{domain?.icon || '📊'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-display font-semibold text-text-primary">{domain?.label || report.category}</span>
                        {scoreData?.current != null && (
                          <span className="ml-2 text-xs font-mono font-medium" style={{ color: scoreData.current >= 75 ? '#22C55E' : scoreData.current >= 50 ? '#FBBF24' : '#F87171' }}>
                            {scoreData.current}/100
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-text-muted">{new Date(report.generated_at).toLocaleTimeString()}</span>
                  </summary>
                  <div className="mt-4 pt-4 border-t border-border text-xs text-text-muted whitespace-pre-wrap leading-relaxed">
                    {report.content}
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-xs text-text-muted">No reports for {reportDate}. Click Generate to create them.</p>
          </div>
        )}
      </div>

      {showAdd && <AddReminderModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchReminders(); }} />}
    </div>
  );
}

function AddReminderModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '', type: 'checkin', time: '08:00', days: '1,2,3,4,5,6,7', integration: null, message: '',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const toggleDay = (day) => {
    const current = form.days.split(',').filter(Boolean);
    const newDays = current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort();
    setForm({ ...form, days: newDays.join(',') });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      await axios.post('/api/reminders', form);
      toast.success('Reminder created');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,14,28,0.92)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl slide-up p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-text-primary text-base">Add Reminder</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl transition-colors">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <TextInput label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g. Morning Check-In" />

          <div>
            <label className="text-xs text-text-muted block mb-2.5">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_TYPES.map((t) => (
                <button key={t.id} type="button" onClick={() => setForm({ ...form, type: t.id })} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-all duration-200 ${form.type === t.id ? 'border-teal/50 bg-teal/10 text-teal' : 'border-border text-text-muted hover:border-text-muted'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1.5">Time</label>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary" />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1.5">Integration</label>
              <select value={form.integration || ''} onChange={(e) => setForm({ ...form, integration: e.target.value || null })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary">
                {INTEGRATION_OPTIONS.map((o) => <option key={o.id || 'none'} value={o.id || ''}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted block mb-2.5">Days</label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => {
                const day = String(i + 1);
                const active = form.days.split(',').includes(day);
                return (
                  <button key={day} type="button" onClick={() => toggleDay(day)} className={`w-10 h-10 rounded-xl text-xs border transition-all duration-200 ${active ? 'border-teal/50 bg-teal/10 text-teal' : 'border-border text-text-muted hover:border-text-muted'}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted block mb-1.5">Message (optional)</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Custom reminder message..." rows={2} className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal resize-none" />
          </div>

          <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all duration-200 disabled:opacity-50" style={{ background: ACCENT_GRADIENT, color: ACCENT_BG }}>
            {saving ? 'Creating...' : 'Create Reminder'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Activities Tab ─────────────────────────────────────

function ActivitiesTab() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterDomain, setFilterDomain] = useState(null);
  const toast = useToast();

  const fetchActivities = useCallback(async () => {
    try {
      const url = filterDomain ? `/api/activities?domain=${filterDomain}` : '/api/activities';
      const r = await axios.get(url);
      setActivities(r.data);
    } catch {
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [filterDomain]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const deleteActivity = async (id) => {
    try {
      await axios.delete(`/api/activities/${id}`);
      toast.success('Activity removed');
      fetchActivities();
    } catch {
      toast.error('Failed to remove activity');
    }
  };

  const grouped = DOMAINS.map((d) => ({
    ...d,
    positive: activities.filter((a) => a.domain === d.id && a.impact === 'positive'),
    negative: activities.filter((a) => a.domain === d.id && a.impact === 'negative'),
  })).filter((g) => !filterDomain || g.id === filterDomain);

  return (
    <div>
      <SectionHeader title="Activity Definitions" subtitle="Define activities that increase or decrease your daily pillar scores. Weight 1-5 controls impact strength (3 points per weight level).">
        <AccentButton onClick={() => setShowAdd(true)}>+ Add Activity</AccentButton>
      </SectionHeader>

      <DomainFilter value={filterDomain} onChange={setFilterDomain} />

      {loading ? (
        <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="card animate-pulse h-32" />)}</div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.id} className="card" style={{ borderColor: group.color + '15' }}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: group.color + '12' }}>
                  <span className="text-base">{group.icon}</span>
                </div>
                <h3 className="font-display font-semibold text-sm" style={{ color: group.color }}>{group.label}</h3>
                <span className="text-xs text-text-muted ml-auto">{group.positive.length + group.negative.length} activities</span>
              </div>
              {group.positive.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-physical mb-2 flex items-center gap-1 font-medium"><span>+</span> Score Boosters</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.positive.map((a) => <ActivityCard key={a.id} activity={a} color={group.color} onDelete={deleteActivity} />)}
                  </div>
                </div>
              )}
              {group.negative.length > 0 && (
                <div>
                  <p className="text-xs mb-2 flex items-center gap-1 font-medium" style={{ color: '#F87171' }}><span>-</span> Score Reducers</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.negative.map((a) => <ActivityCard key={a.id} activity={a} color="#F87171" onDelete={deleteActivity} />)}
                  </div>
                </div>
              )}
              {group.positive.length === 0 && group.negative.length === 0 && (
                <p className="text-xs text-text-muted text-center py-4">No activities defined for {group.label}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {showAdd && <AddActivityModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchActivities(); }} />}
    </div>
  );
}

function ActivityCard({ activity, color, onDelete }) {
  const points = activity.weight * 3;
  const sign = activity.impact === 'positive' ? '+' : '-';
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-bg/30 group transition-colors hover:border-border/80">
      <span className="text-lg">{activity.icon || '◎'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-display font-medium text-text-primary truncate">{activity.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-mono font-bold" style={{ color: activity.impact === 'positive' ? '#22C55E' : '#F87171' }}>{sign}{points}pts</span>
          <span className="text-[10px] text-text-muted font-mono">wt:{activity.weight}</span>
        </div>
      </div>
      <button onClick={() => onDelete(activity.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 text-xs transition-all">×</button>
    </div>
  );
}

function AddActivityModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', domain: 'physical', impact: 'positive', weight: 3, icon: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Activity name is required'); return; }
    setSaving(true);
    try {
      await axios.post('/api/activities', form);
      toast.success(`Activity "${form.name}" added`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,14,28,0.92)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl slide-up p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-text-primary text-base">Add Activity</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl transition-colors">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-3">
            <div className="w-16">
              <label className="text-xs text-text-muted block mb-1.5">Icon</label>
              <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🎯" className="w-full px-2 py-2.5 rounded-xl border border-border bg-bg text-center text-lg focus:outline-none focus:border-teal" maxLength={4} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-muted block mb-1.5">Activity Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gym, Scrolling, Quran Reading" className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal" autoFocus />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-2.5">Domain</label>
            <DomainPicker value={form.domain} onChange={(v) => setForm({ ...form, domain: v })} columns={4} />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-2.5">Impact</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, impact: 'positive' })} className={`flex-1 px-3 py-2.5 rounded-xl text-xs border transition-all duration-200 ${form.impact === 'positive' ? 'border-physical/50 bg-physical/10 text-physical' : 'border-border text-text-muted hover:border-text-muted'}`}>+ Positive</button>
              <button type="button" onClick={() => setForm({ ...form, impact: 'negative' })} className={`flex-1 px-3 py-2.5 rounded-xl text-xs border transition-all duration-200 ${form.impact === 'negative' ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-border text-text-muted hover:border-text-muted'}`}>- Negative</button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-text-muted">Weight</label>
              <span className="text-xs font-mono font-semibold" style={{ color: form.impact === 'positive' ? '#22C55E' : '#F87171' }}>{form.impact === 'positive' ? '+' : '-'}{form.weight * 3} pts</span>
            </div>
            <input type="range" min={1} max={5} value={form.weight} onChange={(e) => setForm({ ...form, weight: parseInt(e.target.value) })} className="w-full" />
            <div className="flex justify-between text-[10px] text-text-muted mt-1"><span>1 (light)</span><span>3 (moderate)</span><span>5 (major)</span></div>
          </div>
          <button type="submit" disabled={saving || !form.name.trim()} className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all duration-200 disabled:opacity-50" style={{ background: ACCENT_GRADIENT, color: ACCENT_BG }}>
            {saving ? 'Adding...' : 'Add Activity'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Data & Import Tab ──────────────────────────────────

function DataTab() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [textContent, setTextContent] = useState('');
  const [importing, setImporting] = useState(null);
  const [importHistory, setImportHistory] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get('/api/checkin/history?days=9999'),
      axios.get('/api/activities'),
      axios.get('/api/goals'),
      axios.get('/api/imports'),
    ]).then(([h, a, g, imp]) => {
      setStats({ checkins: h.data.length, activities: a.data.length, goals: g.data.length });
      setImportHistory(imp.data);
    }).catch(() => {});
  }, []);

  const importCSV = async () => {
    if (!csvText.trim()) return;
    setImporting('csv');
    try {
      const r = await axios.post('/api/imports/csv', { content: csvText, filename: 'paste-import.csv' });
      toast.success(`Imported ${r.data.imported} check-ins (${r.data.skipped} skipped)`);
      if (r.data.errors?.length) toast.warning(r.data.errors[0]);
      setCsvText('');
      const imp = await axios.get('/api/imports');
      setImportHistory(imp.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(null);
    }
  };

  const importText = async () => {
    if (!textContent.trim()) return;
    setImporting('text');
    try {
      const r = await axios.post('/api/imports/text', { content: textContent, type: 'notes' });
      toast.success(`Saved ${r.data.filename} (${r.data.size} bytes)`);
      setTextContent('');
      const imp = await axios.get('/api/imports');
      setImportHistory(imp.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="card glow-teal">
          <h3 className="font-display font-semibold text-sm text-text-primary mb-5">Database Overview</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Check-ins', value: stats.checkins, color: '#14B8A6' },
              { label: 'Activities', value: stats.activities, color: '#8B5CF6' },
              { label: 'Goals', value: stats.goals, color: '#F97316' },
            ].map((s) => (
              <div key={s.label} className="text-center py-3 rounded-xl bg-bg/50">
                <p className="font-display font-bold text-2xl" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import CSV */}
      <div className="card">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-2">Import Check-In Data (CSV)</h3>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Paste CSV data with columns: date, sleep_hours, exercise, energy_score, etc. First row must be headers.
        </p>
        <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={4} placeholder="date,sleep_hours,exercise,energy_score,nutrition_score,...&#10;2025-01-15,7.5,1,8,7,..." className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-teal resize-none mb-3" />
        <AccentButton variant="ghost" onClick={importCSV} disabled={importing === 'csv' || !csvText.trim()}>
          {importing === 'csv' ? 'Importing...' : 'Import CSV'}
        </AccentButton>
      </div>

      {/* Import Text/Notes */}
      <div className="card">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-2">Import Text / Notes</h3>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Paste reflections, journal entries, or notes. Stored as files for future reference and AI analysis.
        </p>
        <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={4} placeholder="Paste your notes, reflections, or journal content here..." className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-teal resize-none mb-3" />
        <AccentButton variant="ghost" onClick={importText} disabled={importing === 'text' || !textContent.trim()}>
          {importing === 'text' ? 'Saving...' : 'Save Notes'}
        </AccentButton>
      </div>

      {/* Import Images/Video (metadata) */}
      <div className="card">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-2">Import Media</h3>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Register images, videos, or documents for reference. Files are stored locally in the <code className="text-teal">uploads/</code> directory.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { type: 'Image', icon: '🖼️' },
            { type: 'Video', icon: '🎬' },
            { type: 'PDF', icon: '📄' },
            { type: 'Document', icon: '📎' },
          ].map(({ type, icon }) => (
            <button
              key={type}
              onClick={async () => {
                const name = prompt(`Enter ${type.toLowerCase()} filename:`);
                if (!name) return;
                try {
                  await axios.post('/api/imports/file', { filename: name, type: type.toLowerCase() });
                  toast.success(`${type} "${name}" registered`);
                  const imp = await axios.get('/api/imports');
                  setImportHistory(imp.data);
                } catch {
                  toast.error('Failed to register file');
                }
              }}
              className="px-3 py-4 rounded-xl border border-border bg-bg/30 text-center hover:border-teal/30 hover:bg-teal/5 transition-all duration-200"
            >
              <p className="text-xl mb-1.5">{icon}</p>
              <p className="text-xs text-text-muted">{type}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="card">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-2">Export Data</h3>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">Download your full check-in history with all scores, activities, and computed data.</p>
        <div className="flex gap-3">
          <a href="/api/analytics/export?format=csv" download className="px-4 py-2.5 rounded-xl text-xs text-text-primary border border-border hover:border-teal hover:text-teal transition-all duration-200">Export CSV</a>
          <a href="/api/analytics/export?format=json" download className="px-4 py-2.5 rounded-xl text-xs text-text-primary border border-border hover:border-teal hover:text-teal transition-all duration-200">Export JSON</a>
        </div>
      </div>

      {/* Import History */}
      {importHistory.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold text-sm text-text-primary mb-4">Import History</h3>
          <div className="space-y-2">
            {importHistory.slice(0, 10).map((imp) => (
              <div key={imp.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-bg/50 border border-border/50">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{imp.type === 'csv' ? '📊' : imp.type === 'text' || imp.type === 'notes' ? '📝' : imp.type === 'goals' ? '🎯' : '📎'}</span>
                  <span className="text-xs font-mono text-text-primary truncate max-w-[200px]">{imp.filename}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  {imp.records_imported > 0 && <span className="text-teal font-medium">{imp.records_imported} imported</span>}
                  <span>{imp.status}</span>
                  <span>{new Date(imp.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* .env Info */}
      <div className="card">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-4">Environment</h3>
        <p className="text-xs text-text-muted mb-3 leading-relaxed">Integration API keys can also be set via <code className="text-teal">.env</code>.</p>
        <div className="bg-bg rounded-xl p-4 font-mono text-xs text-text-muted space-y-1 border border-border/50">
          <p><span className="text-teal">ANTHROPIC_API_KEY</span>=sk-ant-...</p>
          <p><span className="text-teal">PERPLEXITY_API_KEY</span>=pplx-...</p>
          <p><span className="text-teal">NOTION_API_KEY</span>=secret_...</p>
          <p><span className="text-teal">NOTION_DATABASE_ID</span>=...</p>
          <p><span className="text-teal">PORT</span>=3001</p>
        </div>
      </div>
    </div>
  );
}

// ─── Billing Tab ────────────────────────────────────────

function BillingTab() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [nameForm, setNameForm] = useState(user?.name || '');
  const [modeForm, setModeForm] = useState(user?.mode || 'personal');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    axios.get('/api/billing/status').then(r => setStatus(r.data)).catch(() => setStatus(null)).finally(() => setLoading(false));
  }, []);

  const upgrade = async () => {
    setRedirecting(true);
    try {
      const r = await axios.post('/api/billing/checkout');
      if (r.data.url) window.location.href = r.data.url;
      else toast.error(r.data.error || 'Checkout not available');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Billing not configured — set STRIPE_SECRET_KEY');
    } finally { setRedirecting(false); }
  };

  const manageSubscription = async () => {
    setRedirecting(true);
    try {
      const r = await axios.post('/api/billing/portal');
      if (r.data.url) window.location.href = r.data.url;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not open billing portal');
    } finally { setRedirecting(false); }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateUser({ name: nameForm, mode: modeForm });
      toast.success('Profile updated');
    } catch { toast.error('Failed to save'); }
    finally { setSavingProfile(false); }
  };

  const isPro = status?.is_pro;

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="card">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-4">Account</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Display Name</label>
            <input type="text" value={nameForm} onChange={(e) => setNameForm(e.target.value)} placeholder="Your name" className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal transition-colors" />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Email</label>
            <input type="email" value={user?.email || ''} disabled className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg/50 text-sm text-text-muted cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-2">Operating Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ id: 'personal', label: 'Personal Mode', desc: 'Whole-self balance' }, { id: 'operator', label: 'Operator Mode', desc: 'Founder execution' }].map(m => (
                <button key={m.id} onClick={() => setModeForm(m.id)} className="text-left p-3 rounded-xl border transition-all" style={modeForm === m.id ? { borderColor: 'rgba(139,0,0,0.4)', background: 'rgba(139,0,0,0.08)' } : { borderColor: '#252540' }}>
                  <p className="text-xs font-semibold text-text-primary">{m.label}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <AccentButton onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save Profile'}</AccentButton>
        </div>
      </div>

      {/* Plan */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-sm text-text-primary">Plan</h3>
            {loading ? <div className="h-4 w-16 bg-border rounded animate-pulse mt-1" /> : (
              <p className="text-xs text-text-muted mt-1">
                {isPro ? `PatternOS Pro${status?.subscription_end ? ` · renews ${new Date(status.subscription_end).toLocaleDateString()}` : ''}` : 'Free plan — 7 days history, 1 plan/day'}
              </p>
            )}
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-mono ${isPro ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20' : 'text-text-muted bg-border/30 border border-border'}`}>
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>

        {!isPro && (
          <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.15)' }}>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-2xl text-text-primary">$20</span>
              <span className="text-sm text-text-muted">/ month</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {['Unlimited day plans', 'Full 90-day history', 'AI pattern digests', 'Google Calendar sync', 'Operator Mode', 'All integrations'].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="text-physical text-[10px]">✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {!isPro ? (
            <AccentButton onClick={upgrade} disabled={redirecting}>{redirecting ? 'Redirecting…' : 'Upgrade to Pro →'}</AccentButton>
          ) : (
            <AccentButton variant="ghost" onClick={manageSubscription} disabled={redirecting}>Manage Subscription</AccentButton>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Tab ──────────────────────────────────

function NotificationsTab() {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe, sendTest } = usePushNotifications();
  const [testResult, setTestResult] = React.useState(null);

  const handleToggle = async () => {
    if (subscribed) {
      await unsubscribe();
      setTestResult(null);
    } else {
      const result = await subscribe();
      if (result.error) setTestResult({ error: result.error });
    }
  };

  const handleTest = async () => {
    const result = await sendTest();
    setTestResult(result);
    setTimeout(() => setTestResult(null), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-1">Push Notifications</h3>
        <p className="text-xs text-text-muted mb-4">
          Get daily check-in reminders, plan alerts, and intelligence updates on your iPhone or Mac.
        </p>

        {!supported ? (
          <div className="rounded-xl p-4" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p className="text-xs text-red-400">
              Push notifications are not supported in this browser.
              {navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
                ? ' On iPhone, save the app to your home screen first (Share → Add to Home Screen), then enable from there.'
                : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(37,37,64,0.4)', border: '1px solid #252540' }}>
              <div>
                <p className="text-sm text-text-primary font-medium">
                  {subscribed ? '✓ Notifications enabled' : 'Enable notifications'}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {permission === 'denied'
                    ? 'Blocked — allow in browser/phone settings'
                    : subscribed
                    ? 'You\'ll receive check-in reminders and plan alerts'
                    : 'Daily reminders to check in and plan your day'}
                </p>
              </div>
              <button
                onClick={handleToggle}
                disabled={loading || permission === 'denied'}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                style={subscribed
                  ? { border: '1px solid #252540', color: '#5A5A72' }
                  : { background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }
                }
              >
                {loading ? '...' : subscribed ? 'Disable' : 'Enable'}
              </button>
            </div>

            {subscribed && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTest}
                  className="text-xs px-3 py-2 rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors"
                >
                  Send test notification
                </button>
                {testResult && (
                  <span className="text-xs" style={{ color: testResult.error ? '#F87171' : '#22C55E' }}>
                    {testResult.error ? `Error: ${testResult.error}` : `✓ Sent to ${testResult.sent} device(s)`}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-3">Install on iPhone</h3>
        <ol className="space-y-3">
          {[
            { n: '1', text: 'Open PatternOS in Safari on your iPhone' },
            { n: '2', text: 'Tap the Share button (the box with an arrow pointing up)' },
            { n: '3', text: 'Scroll down and tap "Add to Home Screen"' },
            { n: '4', text: 'Tap Add — PatternOS will appear on your home screen like a native app' },
            { n: '5', text: 'Open the installed app and enable notifications in Settings → Notifications above' },
          ].map(({ n, text }) => (
            <li key={n} className="flex items-start gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(139,0,0,0.15)', color: '#8B0000', border: '1px solid rgba(139,0,0,0.25)' }}
              >
                {n}
              </span>
              <p className="text-xs text-text-muted pt-0.5">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─── About Tab ──────────────────────────────────────────

function AboutTab() {
  return (
    <div className="card glow-teal">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
          <span className="text-lg font-bold" style={{ color: ACCENT_BG }}>P</span>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-text-primary tracking-tight">PatternOS</h2>
          <p className="text-xs text-text-muted">Personal intelligence dashboard</p>
        </div>
      </div>

      <div className="space-y-5 text-xs text-text-muted">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Version', value: '2.0.0' },
            { label: 'Database', value: 'Supabase Postgres' },
            { label: 'Server', value: 'Vercel Serverless' },
            { label: 'Frontend', value: 'React 18 + Vite 5' },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3 rounded-xl bg-bg border border-border/50">
              <p className="text-text-muted mb-1 text-[10px] uppercase tracking-wider">{item.label}</p>
              <p className="text-text-primary font-medium text-xs">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border space-y-2.5 leading-relaxed">
          <p><span className="text-text-primary font-medium">Integrations:</span> Anthropic, Perplexity, Notion, Google Cal, MCP, n8n, Webhook</p>
          <p><span className="text-text-primary font-medium">Scoring:</span> Base (check-in) + Activity modifiers (capped ±30)</p>
          <p><span className="text-text-primary font-medium">Evolutions:</span> {DOMAINS.map(d => d.evolution).join(' · ')}</p>
          <p><span className="text-text-primary font-medium">Pillars:</span> {DOMAINS.map(d => d.label).join(' · ')}</p>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-text-muted leading-relaxed">
            See the hidden patterns behind your life. One daily check-in that connects physical, mental, financial, spiritual, social, purpose, and awareness signals.
          </p>
        </div>
      </div>
    </div>
  );
}
