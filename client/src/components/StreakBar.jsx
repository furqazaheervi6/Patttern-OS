import React, { useState, useEffect } from 'react';
import axios from 'axios';

const STREAK_CONFIG = {
  checkin:    { label: 'Check-In',   color: '#60A5FA' },
  exercise:   { label: 'Exercise',   color: '#22C55E' },
  meditation: { label: 'Focus',      color: '#C084FC' },
  learning:   { label: 'Learning',   color: '#06B6D4' },
  gratitude:  { label: 'Gratitude',  color: '#F97316' },
  sleep7plus: { label: 'Sleep 7h+',  color: '#F472B6' },
};

function StreakItem({ label, color, current, best }) {
  const isHot = current >= 7;

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}
    >
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: '0.6rem', color: '#4A4A68', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'DM Mono, monospace', marginBottom: '2px' }}>
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color, lineHeight: 1 }}>
            {current}
          </span>
          <span style={{ fontSize: '0.6rem', color: '#3A3A50', fontFamily: 'DM Mono, monospace' }}>days</span>
          {isHot && <span style={{ fontSize: '0.75rem' }}>🔥</span>}
        </div>
      </div>
      {best > current && (
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.58rem', color: '#3A3A50', fontFamily: 'DM Mono, monospace' }}>best</p>
          <p style={{ fontSize: '0.7rem', color: '#4A4A68', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{best}</p>
        </div>
      )}
    </div>
  );
}

export default function StreakBar({ filter }) {
  const [streaks, setStreaks] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStreaks = React.useCallback(() => {
    axios.get('/api/analytics/streaks')
      .then(r => setStreaks(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStreaks();
    window.addEventListener('patternos:checkin_saved', fetchStreaks);
    return () => window.removeEventListener('patternos:checkin_saved', fetchStreaks);
  }, [fetchStreaks]);

  if (loading || !streaks) return null;

  const entries = Object.entries(streaks)
    .filter(([key]) => !filter || filter.includes(key))
    .filter(([, val]) => val.current > 0 || val.best > 0);

  if (entries.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4 fade-in"
      style={{ background: 'rgba(20,20,36,0.6)', border: '1px solid #252540' }}
    >
      <p style={{ fontSize: '0.7rem', color: '#4A4A68', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '12px' }}>
        Active Streaks
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {entries.map(([key, val]) => {
          const cfg = STREAK_CONFIG[key] || { label: key, color: '#5A5A72' };
          return (
            <StreakItem
              key={key}
              label={cfg.label}
              color={cfg.color}
              current={val.current}
              best={val.best}
            />
          );
        })}
      </div>
    </div>
  );
}
