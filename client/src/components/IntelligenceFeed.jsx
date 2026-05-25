import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PRIORITY_STYLE = {
  high:   { dot: '#F87171', border: 'rgba(248,113,113,0.15)', bg: 'rgba(248,113,113,0.04)' },
  medium: { dot: '#FBBF24', border: 'rgba(251,191,36,0.15)',  bg: 'rgba(251,191,36,0.04)'  },
  low:    { dot: '#60A5FA', border: 'rgba(96,165,250,0.15)',  bg: 'rgba(96,165,250,0.04)'  },
};

function InsightCard({ insight, index }) {
  const s = PRIORITY_STYLE[insight.priority] || PRIORITY_STYLE.low;
  return (
    <div
      className="rounded-xl p-4 fade-in"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div className="flex items-start gap-3">
        <span style={{ fontSize: '1.1rem', lineHeight: 1, marginTop: '2px', flexShrink: 0 }}>
          {insight.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: s.dot }}
            />
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#C9C9C9',
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: '0.02em',
              }}
            >
              {insight.title}
            </p>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#5A5A72', lineHeight: 1.5, marginBottom: '8px' }}>
            {insight.body}
          </p>
          <span
            style={{
              fontSize: '0.62rem',
              color: '#8B0000',
              background: 'rgba(139,0,0,0.1)',
              border: '1px solid rgba(139,0,0,0.2)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            → {insight.action}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function IntelligenceFeed({ compact = false }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/intelligence/feed')
      .then(r => setInsights(r.data.insights || []))
      .catch(() => setInsights([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl h-16 animate-pulse" style={{ background: 'rgba(37,37,64,0.4)' }} />
        ))}
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      {insights.slice(0, compact ? 2 : 3).map((ins, i) => (
        <InsightCard key={i} insight={ins} index={i} />
      ))}
    </div>
  );
}
