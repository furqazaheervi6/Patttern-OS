import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatDate } from '../utils/formatters.js';

const PILLARS = [
  { key: 'physical_score', label: 'Physical', color: '#22C55E' },
  { key: 'mental_score', label: 'Mental', color: '#60A5FA' },
  { key: 'financial_score', label: 'Financial', color: '#FBBF24' },
  { key: 'spiritual_score', label: 'Spiritual', color: '#C084FC' },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card text-xs p-3 space-y-1" style={{ border: '1px solid #1E1E2E' }}>
      <p className="font-display font-semibold text-text-primary mb-2">{formatDate(label)}</p>
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

export default function TrendChart({ data = [] }) {
  const [active, setActive] = useState(
    PILLARS.reduce((acc, p) => ({ ...acc, [p.key]: true }), {})
  );

  if (!data.length) {
    return (
      <div className="card chart-card h-64 flex items-center justify-center text-center px-6">
        <p className="text-text-muted text-sm font-mono leading-relaxed">No trend data yet. Complete a check-in to start the 30-day view.</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <h3 className="font-display font-semibold text-sm text-text-primary whitespace-nowrap">30-Day Trend</h3>
        <div className="chart-toggles">
          {PILLARS.map((p) => (
            <button
              key={p.key}
              onClick={() => setActive((prev) => ({ ...prev, [p.key]: !prev[p.key] }))}
              className="text-xs px-2 py-0.5 rounded font-mono transition-opacity"
              style={{
                color: p.color,
                border: `1px solid ${p.color}40`,
                opacity: active[p.key] ? 1 : 0.3,
                background: active[p.key] ? `${p.color}10` : 'transparent',
                minHeight: '22px',
                lineHeight: 1.2,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={sorted} margin={{ top: 5, right: 22, bottom: 12, left: -8 }}>
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
          {PILLARS.map((p) =>
            active[p.key] ? (
              <Line
                key={p.key}
                type="monotone"
                dataKey={p.key}
                name={p.label}
                stroke={p.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: p.color }}
                connectNulls={false}
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
