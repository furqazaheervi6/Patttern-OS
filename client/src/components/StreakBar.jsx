import React, { useState, useEffect } from 'react';
import axios from 'axios';

const STREAK_CONFIG = {
  checkin: { label: 'Check-In', icon: '📋', color: '#60A5FA' },
  exercise: { label: 'Exercise', icon: '💪', color: '#22C55E' },
  meditation: { label: 'Meditation', icon: '🧘', color: '#C084FC' },
  learning: { label: 'Learning', icon: '📚', color: '#06B6D4' },
  gratitude: { label: 'Gratitude', icon: '🙏', color: '#F97316' },
  sleep7plus: { label: 'Sleep 7+hrs', icon: '🌙', color: '#F472B6' },
};

export default function StreakBar({ filter }) {
  const [streaks, setStreaks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/analytics/streaks')
      .then(r => setStreaks(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !streaks) return null;

  const entries = Object.entries(streaks)
    .filter(([key]) => !filter || filter.includes(key))
    .filter(([, val]) => val.current > 0 || val.best > 0);

  if (entries.length === 0) return null;

  return (
    <div className="card">
      <h3 className="font-display font-semibold text-sm text-text-primary mb-3">Active Streaks</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map(([key, val]) => {
          const cfg = STREAK_CONFIG[key] || { label: key, icon: '🔥', color: '#6B7280' };
          return (
            <div
              key={key}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-bg/50"
            >
              <span className="text-lg">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-muted font-mono truncate">{cfg.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-bold text-lg" style={{ color: cfg.color }}>
                    {val.current}
                  </span>
                  <span className="text-xs text-text-muted font-mono">days</span>
                  {val.best > val.current && (
                    <span className="text-xs text-text-muted font-mono">
                      best: {val.best}
                    </span>
                  )}
                </div>
              </div>
              {val.current >= 7 && <span className="text-sm">🔥</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
