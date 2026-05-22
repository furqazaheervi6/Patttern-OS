import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ComparisonWidget() {
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/analytics/comparison?period=${period}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const pillars = [
    { key: 'physical_score', label: 'Physical', color: '#22C55E' },
    { key: 'mental_score', label: 'Mental', color: '#60A5FA' },
    { key: 'financial_score', label: 'Financial', color: '#FBBF24' },
    { key: 'spiritual_score', label: 'Spiritual', color: '#C084FC' },
    { key: 'overall_score', label: 'Overall', color: '#F8F8FF' },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-sm text-text-primary">Period Comparison</h3>
        <div className="flex gap-1">
          {['week', 'month'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="text-xs font-mono px-2.5 py-1 rounded transition-colors"
              style={{
                background: period === p ? '#1E1E2E' : 'transparent',
                color: period === p ? '#F8F8FF' : '#6B7280',
              }}
            >
              {p === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div className="h-32 flex items-center justify-center">
          <span className="text-xs text-text-muted font-mono">Loading...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {pillars.map(p => {
            const curr = data.current?.avg?.[p.key];
            const prev = data.previous?.avg?.[p.key];
            const d = data.delta?.[p.key];

            return (
              <div key={p.key} className="flex items-center gap-3">
                <span className="text-xs text-text-muted font-mono w-16 text-right">{p.label}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-3 rounded-full bg-border overflow-hidden relative">
                    {/* Previous period (dimmed) */}
                    {prev != null && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-full opacity-25"
                        style={{ width: `${prev}%`, backgroundColor: p.color }}
                      />
                    )}
                    {/* Current period */}
                    {curr != null && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{ width: `${curr}%`, backgroundColor: p.color }}
                      />
                    )}
                  </div>
                  <span className="text-xs font-mono w-8 text-right" style={{ color: p.color }}>
                    {curr ?? '—'}
                  </span>
                  {d != null && (
                    <span
                      className="text-xs font-mono w-10"
                      style={{ color: d > 0 ? '#22C55E' : d < 0 ? '#F87171' : '#6B7280' }}
                    >
                      {d > 0 ? '+' : ''}{d}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-text-muted font-mono">
              This {period}: {data.current?.days} days
            </span>
            <span className="text-xs text-text-muted font-mono">
              Last {period}: {data.previous?.days} days
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
