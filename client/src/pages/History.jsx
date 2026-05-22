import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { usePillarData } from '../hooks/usePillarData.js';
import { formatDate, pillarColor, pillarName } from '../utils/formatters.js';
import { scoreColor } from '../utils/scoring.js';

const PILLARS = ['physical', 'mental', 'financial', 'spiritual'];
const RANGES = [7, 14, 30, 60, 90];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card text-xs p-3 space-y-1">
      <p className="font-display font-semibold text-text-primary mb-1">{formatDate(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-text-muted">{p.name}:</span>
          <span className="font-mono" style={{ color: p.color }}>
            {Math.round(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function History() {
  const [days, setDays] = useState(30);
  const { history, loading } = usePillarData(days);
  const [view, setView] = useState('line');

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));

  const averages = PILLARS.reduce((acc, p) => {
    const vals = history.map((d) => d[`${p}_score`]).filter((v) => v != null);
    acc[p] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-xl text-text-primary">History</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-colors ${
                  days === r
                    ? 'bg-mental/20 text-mental border border-mental/30'
                    : 'text-text-muted border border-border hover:text-text-primary'
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
          <div className="flex gap-1 ml-2">
            {['line', 'bar'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs px-3 py-1.5 rounded-lg font-mono capitalize transition-colors ${
                  view === v
                    ? 'bg-border text-text-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex gap-1 ml-2">
            <a
              href="/api/analytics/export?format=csv"
              download
              className="text-xs px-3 py-1.5 rounded-lg font-mono text-text-muted border border-border hover:text-text-primary hover:border-text-muted transition-colors"
            >
              CSV
            </a>
            <a
              href="/api/analytics/export?format=json"
              download
              className="text-xs px-3 py-1.5 rounded-lg font-mono text-text-muted border border-border hover:text-text-primary hover:border-text-muted transition-colors"
            >
              JSON
            </a>
          </div>
        </div>
      </div>

      {/* Average cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {PILLARS.map((p) => (
          <div key={p} className="card text-center">
            <p className="text-xs text-text-muted font-mono mb-1">{pillarName(p)} avg</p>
            <p
              className="font-display font-bold text-2xl"
              style={{ color: scoreColor(averages[p]) }}
            >
              {averages[p]}
            </p>
          </div>
        ))}
      </div>

      {/* Main chart */}
      <div className="card mb-6">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-4">
          Pillar Scores — {days} Days
        </h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-text-muted text-xs">
            <span className="animate-spin mr-2">⟳</span> Loading...
          </div>
        ) : sorted.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-text-muted text-xs">
            No data for this range yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            {view === 'line' ? (
              <LineChart data={sorted} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid stroke="#1E1E2E" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'DM Mono' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'DM Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {PILLARS.map((p) => (
                  <Line
                    key={p}
                    type="monotone"
                    dataKey={`${p}_score`}
                    name={pillarName(p)}
                    stroke={pillarColor(p)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={sorted} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid stroke="#1E1E2E" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'DM Mono' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'DM Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {PILLARS.map((p) => (
                  <Bar
                    key={p}
                    dataKey={`${p}_score`}
                    name={pillarName(p)}
                    fill={pillarColor(p)}
                    fillOpacity={0.7}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Data table */}
      {sorted.length > 0 && (
        <div className="card overflow-hidden">
          <h3 className="font-display font-semibold text-sm text-text-primary mb-4">Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-muted font-medium">Date</th>
                  {PILLARS.map((p) => (
                    <th
                      key={p}
                      className="text-right py-2 px-3 font-medium"
                      style={{ color: pillarColor(p) }}
                    >
                      {pillarName(p)}
                    </th>
                  ))}
                  <th className="text-right py-2 pl-3 text-text-muted font-medium">Overall</th>
                </tr>
              </thead>
              <tbody>
                {[...sorted].reverse().map((d) => (
                  <tr
                    key={d.date}
                    className="border-b border-border/50 hover:bg-border/20 transition-colors"
                  >
                    <td className="py-2 pr-4 text-text-muted">{formatDate(d.date)}</td>
                    {PILLARS.map((p) => (
                      <td
                        key={p}
                        className="text-right py-2 px-3 font-semibold"
                        style={{ color: scoreColor(d[`${p}_score`] ?? 0) }}
                      >
                        {d[`${p}_score`] ?? '—'}
                      </td>
                    ))}
                    <td
                      className="text-right py-2 pl-3 font-bold"
                      style={{ color: scoreColor(d.overall_score ?? 0) }}
                    >
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
