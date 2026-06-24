import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area,
} from 'recharts';
import { usePillarData } from '../hooks/usePillarData.js';
import { formatDate, pillarColor, pillarName } from '../utils/formatters.js';
import { scoreColor } from '../utils/scoring.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const PILLARS = ['physical', 'mental', 'financial', 'spiritual'];
const RANGES = [7, 14, 30, 60, 90];

const DOMAIN_CONFIG = {
  financial: { label: 'Revenue',    color: '#FBBF24', target: 480 },
  mental:    { label: 'Product',    color: '#60A5FA', target: 600 },
  physical:  { label: 'Recovery',   color: '#22C55E', target: 300 },
  spiritual: { label: 'Conviction', color: '#C084FC', target: 210 },
  personal:  { label: 'Pipeline',   color: '#94A3B8', target: 300 },
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: '#0D0D16', border: '1px solid #2E2E48', fontSize: '0.7rem' }}>
      <p style={{ color: '#C9C9C9', marginBottom: '6px', fontFamily: 'DM Mono, monospace' }}>{formatDate(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: '#5A5A72' }}>{p.name}:</span>
          <span style={{ color: p.color, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{Math.round(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function DomainRow({ pillar, minutes, target }) {
  const cfg = DOMAIN_CONFIG[pillar] || { label: pillar, color: '#4A4A68', target: 300 };
  const pct = Math.min(100, Math.round((minutes / (target || cfg.target)) * 100));
  const hrs = (minutes / 60).toFixed(1);

  return (
    <div className="flex items-center gap-4">
      <div style={{ width: '80px', fontSize: '0.65rem', color: '#5A5A72', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace', textAlign: 'right' }}>
        {cfg.label}
      </div>
      <div className="flex-1">
        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(37,37,64,0.8)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${cfg.color}70, ${cfg.color})`, borderRadius: '2px', transition: 'width 0.8s ease' }} />
        </div>
      </div>
      <div style={{ width: '60px', textAlign: 'right', fontSize: '0.65rem', color: pct >= 100 ? cfg.color : '#4A4A68', fontFamily: 'DM Mono, monospace' }}>
        {hrs}h
      </div>
      <div style={{ width: '36px', textAlign: 'right', fontSize: '0.6rem', color: '#3A3A50', fontFamily: 'DM Mono, monospace' }}>
        {pct}%
      </div>
    </div>
  );
}

export default function History() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const { history, loading } = usePillarData(days);
  const [view, setView] = useState('area');
  const [opsMetrics, setOpsMetrics] = useState(null);
  const isOperator = user?.mode === 'operator';

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));

  const averages = PILLARS.reduce((acc, p) => {
    const vals = history.map((d) => d[`${p}_score`]).filter((v) => v != null);
    acc[p] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    return acc;
  }, {});

  useEffect(() => {
    if (isOperator) {
      axios.get('/api/ops/metrics').then(r => setOpsMetrics(r.data)).catch(() => {});
    }
  }, [isOperator]);

  const pillarDist = opsMetrics?.pillar_distribution || {};

  return (
    <div className="page-container">

      {/* Header */}
      <div className="flex items-start justify-between mb-5 fade-in">
        <div>
          <h1 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color: '#C9C9C9', letterSpacing: '0.15em', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: '6px' }}>
            History
          </h1>
          <p style={{ fontSize: '0.7rem', color: '#3A3A50', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
            Pillar scores & trends
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: days === r ? 'rgba(139,0,0,0.15)' : 'transparent',
                  border: `1px solid ${days === r ? 'rgba(139,0,0,0.3)' : '#252540'}`,
                  color: days === r ? '#C9C9C9' : '#4A4A68',
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                {r}d
              </button>
            ))}
          </div>
          <div className="flex gap-1 ml-1">
            {['area', 'line', 'bar'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all capitalize"
                style={{
                  background: view === v ? 'rgba(37,37,64,0.6)' : 'transparent',
                  border: `1px solid ${view === v ? '#2E2E48' : '#252540'}`,
                  color: view === v ? '#C9C9C9' : '#4A4A68',
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex gap-1 ml-1">
            <a href="/api/analytics/export?format=csv" download
              style={{ fontSize: '0.7rem', padding: '6px 12px', borderRadius: '8px', border: '1px solid #252540', color: '#4A4A68', fontFamily: 'DM Mono, monospace' }}
              className="hover:text-text-primary transition-colors">CSV</a>
            <a href="/api/analytics/export?format=json" download
              style={{ fontSize: '0.7rem', padding: '6px 12px', borderRadius: '8px', border: '1px solid #252540', color: '#4A4A68', fontFamily: 'DM Mono, monospace' }}
              className="hover:text-text-primary transition-colors">JSON</a>
          </div>
        </div>
      </div>

      {/* Average score cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 fade-in">
        {PILLARS.map((p) => (
          <div
            key={p}
            className="rounded-xl p-4 text-center"
            style={{ background: 'rgba(20,20,36,0.7)', border: '1px solid #252540' }}
          >
            <p style={{ fontSize: '0.7rem', color: '#3A3A50', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '6px' }}>
              {pillarName(p)} avg
            </p>
            <p style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1.8rem', fontWeight: 700, color: scoreColor(averages[p]), letterSpacing: '-0.02em', lineHeight: 1 }}>
              {averages[p] || '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Main trend chart */}
      <div
        className="rounded-xl p-4 mb-4 fade-in"
        style={{ background: 'rgba(20,20,36,0.7)', border: '1px solid #252540' }}
      >
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontSize: '0.7rem', color: '#4A4A68', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
            Pillar Scores — {days} Days
          </p>
        </div>
        {loading ? (
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#3A3A50', fontFamily: 'DM Mono, monospace' }}>Loading...</span>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#3A3A50' }}>No data for this range yet.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            {view === 'bar' ? (
              <BarChart data={sorted} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid stroke="#1A1A2E" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#3A3A50', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: '#3A3A50', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {PILLARS.map((p) => (
                  <Bar key={p} dataKey={`${p}_score`} name={pillarName(p)} fill={pillarColor(p)} fillOpacity={0.6} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            ) : view === 'line' ? (
              <LineChart data={sorted} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid stroke="#1A1A2E" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#3A3A50', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: '#3A3A50', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {PILLARS.map((p) => (
                  <Line key={p} type="monotone" dataKey={`${p}_score`} name={pillarName(p)} stroke={pillarColor(p)} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} connectNulls={false} />
                ))}
              </LineChart>
            ) : (
              <AreaChart data={sorted} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  {PILLARS.map(p => (
                    <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={pillarColor(p)} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={pillarColor(p)} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="#1A1A2E" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#3A3A50', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: '#3A3A50', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {PILLARS.map((p) => (
                  <Area key={p} type="monotone" dataKey={`${p}_score`} name={pillarName(p)} stroke={pillarColor(p)} strokeWidth={1.5} fill={`url(#grad-${p})`} dot={false} activeDot={{ r: 3 }} connectNulls={false} />
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Operator: Execution Domain breakdown */}
      {isOperator && (
        <div
          className="rounded-xl p-4 mb-4 fade-in"
          style={{ background: 'rgba(20,20,36,0.7)', border: '1px solid #252540' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p style={{ fontSize: '0.7rem', color: '#4A4A68', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '2px' }}>
                Execution Domains
              </p>
              <p style={{ fontSize: '0.7rem', color: '#5A5A72' }}>Time allocation — last 7 days</p>
            </div>
            {opsMetrics && (
              <span style={{ fontSize: '0.65rem', color: '#5A5A72', fontFamily: 'DM Mono, monospace' }}>
                {(Object.values(pillarDist).reduce((a, b) => a + (parseInt(b) || 0), 0) / 60).toFixed(1)}h total
              </span>
            )}
          </div>
          {!opsMetrics ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-5 rounded animate-pulse" style={{ background: 'rgba(37,37,64,0.4)' }} />)}
            </div>
          ) : (
            <div className="space-y-3.5">
              {['financial', 'mental', 'physical', 'spiritual', 'personal'].map(p => (
                <DomainRow
                  key={p}
                  pillar={p}
                  minutes={parseInt(pillarDist[p]) || 0}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data table */}
      {sorted.length > 0 && (
        <div
          className="rounded-xl overflow-hidden fade-in"
          style={{ background: 'rgba(20,20,36,0.7)', border: '1px solid #252540' }}
        >
          <div className="px-4 pt-4 pb-2">
            <p style={{ fontSize: '0.7rem', color: '#4A4A68', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
              Log
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: '0.72rem', fontFamily: 'DM Mono, monospace' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #252540' }}>
                  <th className="text-left py-2 px-4" style={{ color: '#3A3A50', fontWeight: 500 }}>Date</th>
                  {PILLARS.map((p) => (
                    <th key={p} className="text-right py-2 px-3" style={{ color: pillarColor(p), fontWeight: 500 }}>
                      {pillarName(p)}
                    </th>
                  ))}
                  <th className="text-right py-2 px-4" style={{ color: '#3A3A50', fontWeight: 500 }}>Overall</th>
                </tr>
              </thead>
              <tbody>
                {[...sorted].reverse().map((d) => (
                  <tr key={d.date} style={{ borderBottom: '1px solid rgba(37,37,64,0.4)' }}
                      className="hover:bg-[rgba(37,37,64,0.2)] transition-colors">
                    <td className="py-2 px-4" style={{ color: '#4A4A68' }}>{formatDate(d.date)}</td>
                    {PILLARS.map((p) => (
                      <td key={p} className="text-right py-2 px-3 font-semibold" style={{ color: scoreColor(d[`${p}_score`] ?? 0) }}>
                        {d[`${p}_score`] ?? '—'}
                      </td>
                    ))}
                    <td className="text-right py-2 px-4 font-bold" style={{ color: scoreColor(d.overall_score ?? 0) }}>
                      {d.overall_score ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
