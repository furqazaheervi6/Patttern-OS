import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const PILLAR_COLORS = {
  physical:  '#22C55E',
  mental:    '#60A5FA',
  financial: '#FBBF24',
  spiritual: '#C084FC',
  personal:  '#94A3B8',
};

const PILLAR_ICONS = {
  physical: '🏋️', mental: '🧠', financial: '💰', spiritual: '🕊️', personal: '◇',
};

function StatCard({ label, value, sub, color = '#14B8A6' }) {
  return (
    <div className="card flex flex-col gap-1.5">
      <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
      <p className="font-display font-bold text-3xl" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </div>
  );
}

function PillarBar({ pillar, minutes, maxMinutes }) {
  const pct = maxMinutes > 0 ? Math.round((minutes / maxMinutes) * 100) : 0;
  const hrs = (minutes / 60).toFixed(1);
  const color = PILLAR_COLORS[pillar] || '#64748B';
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-6 text-center">{PILLAR_ICONS[pillar]}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium capitalize" style={{ color }}>{pillar}</span>
          <span className="text-xs font-mono text-text-muted">{hrs}h · {minutes}min</span>
        </div>
        <div className="h-2 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

const PROVIDER_COLORS = {
  anthropic: '#C084FC',
  openai:    '#10B981',
  gemini:    '#60A5FA',
  groq:      '#FBBF24',
  deepseek:  '#F97316',
  mistral:   '#F472B6',
  perplexity:'#14B8A6',
};

function CostBar({ provider, cost, maxCost, calls, inputTokens, outputTokens }) {
  const pct = maxCost > 0 ? Math.round((cost / maxCost) * 100) : 0;
  const color = PROVIDER_COLORS[provider] || '#64748B';
  const totalTokens = (inputTokens || 0) + (outputTokens || 0);
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-right">
        <span className="text-xs font-medium capitalize" style={{ color }}>{provider}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="h-2 flex-1 rounded-full bg-border overflow-hidden mr-3">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 w-40">
        <span className="text-xs font-mono text-text-primary">${cost.toFixed(4)}</span>
        <span className="text-[10px] text-text-muted ml-2">{calls} calls · {(totalTokens / 1000).toFixed(0)}K tok</span>
      </div>
    </div>
  );
}

function ModelUsageRow({ row }) {
  const color = PROVIDER_COLORS[row.provider] || '#64748B';
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-bg/20 text-xs">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="flex-1 font-mono text-text-primary truncate">{row.model}</span>
      <span className="text-text-muted shrink-0">{row.calls} calls</span>
      <span className="text-text-muted shrink-0 w-28 text-right">
        {((row.input_tokens + row.output_tokens) / 1000).toFixed(0)}K tokens
      </span>
      <span className="font-mono shrink-0 w-20 text-right" style={{ color: row.cost_usd > 0.01 ? '#FBBF24' : '#22C55E' }}>
        ${parseFloat(row.cost).toFixed(4)}
      </span>
    </div>
  );
}

function RecentCallRow({ call }) {
  const color = PROVIDER_COLORS[call.provider] || '#64748B';
  let timeAgo = '';
  try { timeAgo = formatDistanceToNow(new Date(call.created_at), { addSuffix: true }); } catch {}
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="font-mono text-text-muted shrink-0 w-20 capitalize">{call.provider}</span>
      <span className="flex-1 font-mono text-[10px] text-text-muted truncate">{call.model}</span>
      <span className="text-text-muted shrink-0 w-24 text-right font-mono text-[10px]">{call.endpoint || '—'}</span>
      <span className="text-text-muted shrink-0 w-16 text-right font-mono text-[10px]">
        {(((call.input_tokens || 0) + (call.output_tokens || 0)) / 1000).toFixed(1)}K
      </span>
      <span className="font-mono shrink-0 w-16 text-right" style={{ color: parseFloat(call.cost_usd) > 0.005 ? '#FBBF24' : '#22C55E' }}>
        ${parseFloat(call.cost_usd).toFixed(4)}
      </span>
      <span className="text-[10px] text-text-muted shrink-0 w-24 text-right">{timeAgo}</span>
    </div>
  );
}

function PlanLogRow({ plan }) {
  const isError = !!plan.error;
  const statusColor = isError ? '#F87171' : '#22C55E';
  const triggerLabel = plan.trigger === 'replan' ? '↺ Re-plan' : plan.trigger === 'agent_chat' ? '◎ Agent' : '▶ Manual';
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/50 bg-bg/30 text-xs">
      <div className="w-24 font-mono text-text-muted shrink-0">{plan.date}</div>
      <div className="w-20 text-text-muted shrink-0">{triggerLabel}</div>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-text-primary font-medium">{plan.blocks_generated ?? 0} blocks</span>
        {plan.blocks_deconflicted > 0 && (
          <span className="text-amber-400">−{plan.blocks_deconflicted} conflicts</span>
        )}
        {plan.blocks_synced > 0 && (
          <span style={{ color: '#22C55E' }}>↑ {plan.blocks_synced} GCal</span>
        )}
        {plan.gcal_deleted > 0 && (
          <span className="text-red-400">🗑 {plan.gcal_deleted} deleted</span>
        )}
        {isError && (
          <span className="text-red-400 truncate" title={plan.error}>⚠ {plan.error?.slice(0, 60)}</span>
        )}
      </div>
      <div className="shrink-0">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full border"
          style={{ color: statusColor, borderColor: statusColor + '30', background: statusColor + '10' }}
        >
          {isError ? 'error' : 'ok'}
        </span>
      </div>
      {plan.duration_ms && (
        <div className="text-text-muted font-mono shrink-0">{plan.duration_ms}ms</div>
      )}
    </div>
  );
}

export default function Ops() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await axios.get('/api/ops/metrics');
      setMetrics(r.data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPillarMinutes = metrics
    ? Object.values(metrics.pillar_distribution).reduce((a, b) => a + b, 0)
    : 0;
  const maxPillarMinutes = metrics
    ? Math.max(...Object.values(metrics.pillar_distribution), 1)
    : 1;

  return (
    <div className="page-container">
      <div className="pl-10 lg:pl-0 mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-text-primary tracking-tight">Ops Dashboard</h1>
          <p className="text-sm text-text-muted mt-1.5">
            Plan generation, GCal sync health, and pillar time distribution.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-2 rounded-xl border border-border text-text-muted hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50"
        >
          {loading ? '...' : '↺ Refresh'}
        </button>
      </div>

      {error && (
        <div className="card mb-5 border-red-500/30 bg-red-500/5">
          <p className="text-xs text-red-400">
            {error.includes('relation') || error.includes('does not exist')
              ? '⚠ Phase 1 migration not yet run. Open Supabase SQL Editor and run server/db/phase1-migration.sql.'
              : `⚠ ${error}`}
          </p>
        </div>
      )}

      {loading && !metrics ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="card animate-pulse h-20" />)}
        </div>
      ) : metrics ? (
        <div className="space-y-6 fade-in">
          {/* ── Plan stats ── */}
          <div>
            <h2 className="text-xs text-text-muted uppercase tracking-wider mb-3">Plan Generation</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Plans this week"  value={metrics.plans.this_week}  color="#14B8A6" />
              <StatCard label="Plans today"      value={metrics.plans.today}      color="#60A5FA" />
              <StatCard label="Active days / 7d" value={metrics.active_days.last_7}  sub="days with a plan" color="#22C55E" />
              <StatCard label="Active days / 30d" value={metrics.active_days.last_30} sub="days with a plan" color="#8B5CF6" />
            </div>
          </div>

          {/* ── GCal sync ── */}
          <div>
            <h2 className="text-xs text-text-muted uppercase tracking-wider mb-3">Google Calendar Sync (30 days)</h2>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Total blocks"
                value={metrics.sync_stats.total_blocks}
                color="#e0dac3"
              />
              <StatCard
                label="Synced to GCal"
                value={metrics.sync_stats.gcal_synced}
                color="#22C55E"
              />
              <StatCard
                label="Sync rate"
                value={`${metrics.sync_stats.sync_rate ?? 0}%`}
                sub={metrics.sync_stats.sync_rate >= 80 ? 'healthy' : metrics.sync_stats.sync_rate >= 50 ? 'partial' : 'low — run sync'}
                color={metrics.sync_stats.sync_rate >= 80 ? '#22C55E' : metrics.sync_stats.sync_rate >= 50 ? '#FBBF24' : '#F87171'}
              />
            </div>
          </div>

          {/* ── Pillar distribution ── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs text-text-muted uppercase tracking-wider">Pillar Time — Last 7 Days</h2>
              <span className="text-xs font-mono text-text-muted">{(totalPillarMinutes / 60).toFixed(1)}h total</span>
            </div>
            <div className="space-y-3.5">
              {['physical', 'mental', 'financial', 'spiritual', 'personal'].map(p => (
                <PillarBar
                  key={p}
                  pillar={p}
                  minutes={metrics.pillar_distribution[p] ?? 0}
                  maxMinutes={maxPillarMinutes}
                />
              ))}
            </div>
          </div>

          {/* ── API Usage & Cost ── */}
          {metrics.api_usage && (
            <div>
              <h2 className="text-xs text-text-muted uppercase tracking-wider mb-3">API Usage & Cost</h2>

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <StatCard
                  label="Cost (7 days)"
                  value={`$${(metrics.api_usage.last_7d?.cost ?? 0).toFixed(4)}`}
                  color="#FBBF24"
                />
                <StatCard
                  label="Cost (30 days)"
                  value={`$${(metrics.api_usage.last_30d?.cost ?? 0).toFixed(4)}`}
                  color="#F97316"
                />
                <StatCard
                  label="Tokens (7d)"
                  value={`${(((metrics.api_usage.last_7d?.tokens ?? 0)) / 1000).toFixed(0)}K`}
                  color="#60A5FA"
                />
                <StatCard
                  label="Tokens (30d)"
                  value={`${(((metrics.api_usage.last_30d?.tokens ?? 0)) / 1000).toFixed(0)}K`}
                  color="#14B8A6"
                />
              </div>

              {/* By provider */}
              {metrics.api_usage.by_provider?.length > 0 ? (
                <div className="card mb-4">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-4">Cost by Provider — Last 30 Days</p>
                  <div className="space-y-3">
                    {(() => {
                      const maxCost = Math.max(...metrics.api_usage.by_provider.map(r => parseFloat(r.cost) || 0), 0.0001);
                      return metrics.api_usage.by_provider.map(r => (
                        <CostBar
                          key={r.provider}
                          provider={r.provider}
                          cost={parseFloat(r.cost) || 0}
                          maxCost={maxCost}
                          calls={r.calls}
                          inputTokens={r.input_tokens}
                          outputTokens={r.output_tokens}
                        />
                      ));
                    })()}
                  </div>
                </div>
              ) : null}

              {/* By model */}
              {metrics.api_usage.by_model?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Usage by Model</p>
                  <div className="space-y-1.5">
                    {metrics.api_usage.by_model.map(r => (
                      <ModelUsageRow key={`${r.provider}-${r.model}`} row={r} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent calls */}
              {metrics.api_usage.recent?.length > 0 && (
                <div className="card">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Recent API Calls</p>
                  <div className="space-y-1">
                    {metrics.api_usage.recent.map((call, i) => (
                      <RecentCallRow key={i} call={call} />
                    ))}
                  </div>
                </div>
              )}

              {(!metrics.api_usage.by_provider?.length && !metrics.api_usage.by_model?.length) && (
                <div className="card text-center py-8">
                  <p className="text-xs text-text-muted">
                    No usage logged yet. Run the Phase 2 migration to enable tracking, then generate a plan or send a chat message.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Recent plans log ── */}
          <div>
            <h2 className="text-xs text-text-muted uppercase tracking-wider mb-3">Recent Plan Log</h2>
            {metrics.recent_plans.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-xs text-text-muted">No plans logged yet. Generate your first plan from the Calendar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {metrics.recent_plans.map((plan) => (
                  <PlanLogRow key={plan.id} plan={plan} />
                ))}
              </div>
            )}
          </div>

          {lastRefresh && (
            <p className="text-[10px] text-text-muted text-right font-mono">
              Updated {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
      ) : null}

      {/* Migration prompt */}
      {!error && metrics && metrics.plans.total === 0 && metrics.active_days.last_30 === 0 && (
        <div className="mt-4 card border-amber-500/30 bg-amber-500/5">
          <p className="text-xs text-amber-400 font-semibold mb-1">Run the Phase 1 migration</p>
          <p className="text-xs text-text-muted">
            Open Supabase SQL Editor and run the contents of{' '}
            <code className="text-teal">server/db/phase1-migration.sql</code>.
            This creates the <code>pillars</code>, <code>calendar_blocks</code>, and <code>plan_log</code> tables.
          </p>
        </div>
      )}
    </div>
  );
}
