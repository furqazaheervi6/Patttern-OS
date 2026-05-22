import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { localDateStr } from '../utils/formatters.js';

const DOMAIN_COLORS = {
  physical: '#22C55E',
  mental: '#60A5FA',
  financial: '#FBBF24',
  spiritual: '#C084FC',
};

const DOMAIN_LABELS = {
  physical: 'Physical',
  mental: 'Mental',
  financial: 'Financial',
  spiritual: 'Spiritual',
};

export default function ActivityImpact({ date }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = date || localDateStr();

  useEffect(() => {
    axios
      .get(`/api/activities/impact?date=${today}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [today]);

  if (loading) return null;
  if (!data || data.activity_count === 0) return null;

  const domains = ['physical', 'mental', 'financial', 'spiritual'];
  const hasImpact = domains.some((d) => data.modifiers[d] !== 0);
  if (!hasImpact) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-sm text-text-primary">
          Activity Impact
        </h3>
        <span className="text-xs font-mono text-text-muted">
          {data.activity_count} activities today
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {domains.map((d) => {
          const mod = data.modifiers[d];
          const breakdown = data.breakdown[d];
          if (!breakdown) return null;

          return (
            <div
              key={d}
              className="px-3 py-3 rounded-lg border border-border bg-surface/50 text-center"
            >
              <p className="text-xs text-text-muted font-mono mb-1">{DOMAIN_LABELS[d]}</p>
              <p
                className="font-display font-bold text-lg"
                style={{ color: mod > 0 ? '#22C55E' : mod < 0 ? '#F87171' : '#6B7280' }}
              >
                {mod > 0 ? '+' : ''}{mod}
              </p>
              <div className="mt-2 space-y-0.5">
                {breakdown.positive.map((p, i) => (
                  <p key={i} className="text-xs font-mono text-physical truncate">
                    {p.icon} +{p.points}
                  </p>
                ))}
                {breakdown.negative.map((n, i) => (
                  <p key={i} className="text-xs font-mono truncate" style={{ color: '#F87171' }}>
                    {n.icon} {n.points}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Score comparison */}
      {data.base_scores && data.adjusted_scores && (
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-text-muted font-mono mb-2">Score adjustment</p>
          <div className="flex gap-4 flex-wrap">
            {domains.map((d) => {
              const base = data.base_scores[`${d}_score`];
              const adj = data.adjusted_scores[`${d}_score`];
              if (base == null) return null;
              const diff = adj - base;
              if (diff === 0) return null;

              return (
                <div key={d} className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-text-muted">{DOMAIN_LABELS[d]}:</span>
                  <span className="text-text-muted">{base}</span>
                  <span className="text-text-muted">→</span>
                  <span style={{ color: diff > 0 ? '#22C55E' : '#F87171' }} className="font-semibold">
                    {adj} ({diff > 0 ? '+' : ''}{diff})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
