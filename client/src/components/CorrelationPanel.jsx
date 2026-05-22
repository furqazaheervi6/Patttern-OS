import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CorrelationPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/analytics/correlations')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data || data.insufficient) {
    return (
      <div className="card">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-2">Cross-Domain Correlations</h3>
        <p className="text-xs text-text-muted font-mono">Need at least 5 check-ins to detect patterns.</p>
      </div>
    );
  }

  if (data.correlations.length === 0) {
    return (
      <div className="card">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-2">Cross-Domain Correlations</h3>
        <p className="text-xs text-text-muted font-mono">No significant correlations detected yet. Keep tracking!</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-sm text-text-primary">Cross-Domain Correlations</h3>
        <span className="text-xs text-text-muted font-mono">{data.total} data points</span>
      </div>

      <div className="space-y-3">
        {data.correlations.map((c, i) => (
          <div
            key={i}
            className="px-4 py-3 rounded-lg border bg-bg/50"
            style={{
              borderColor: c.strength === 'strong' ? '#22C55E30' : '#1E1E2E',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: c.strength === 'strong' ? '#22C55E15' : '#60A5FA15',
                  color: c.strength === 'strong' ? '#22C55E' : '#60A5FA',
                }}
              >
                {c.strength}
              </span>
              <span className="text-xs text-text-muted font-mono">
                {c.labelA} → {c.labelB}
              </span>
            </div>
            <p className="text-sm text-text-primary font-mono">{c.insight}</p>
            {c.type === 'numeric' && (
              <p className="text-xs text-text-muted mt-1 font-mono">
                r = {c.correlation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
