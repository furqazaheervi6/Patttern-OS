import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function BalanceRing({ thisWeek, lastWeek }) {
  const pillars = [
    { key: 'physical_score', label: '🏋️ Physical' },
    { key: 'mental_score', label: '🧠 Mental' },
    { key: 'financial_score', label: '💰 Financial' },
    { key: 'spiritual_score', label: '🕊️ Spiritual' },
  ];

  const data = pillars.map((p) => ({
    subject: p.label,
    'This Week': thisWeek?.[p.key] ?? 0,
    'Last Week': lastWeek?.[p.key] ?? 0,
  }));

  const noData = !thisWeek || Object.values(thisWeek).every((v) => v === 0);

  if (noData) {
    return (
      <div className="card h-64 flex items-center justify-center">
        <p className="text-text-muted text-sm font-mono">No check-in data yet</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-display font-semibold text-sm text-text-primary mb-4">
        Balance Ring
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="#1E1E2E" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'DM Mono' }}
          />
          <Radar
            name="Last Week"
            dataKey="Last Week"
            stroke="#6B7280"
            fill="#6B7280"
            fillOpacity={0.1}
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <Radar
            name="This Week"
            dataKey="This Week"
            stroke="#60A5FA"
            fill="#60A5FA"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', fontFamily: 'DM Mono', color: '#6B7280' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
