import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function DailyMission() {
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = (force = false) => {
    if (force) setRefreshing(true);
    axios.get(`/api/intelligence/mission${force ? '?force=1' : ''}`)
      .then(r => setMission(r.data.mission || null))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => {
    load();
    const onCheckin = () => load(true);
    window.addEventListener('patternos:checkin_saved', onCheckin);
    return () => window.removeEventListener('patternos:checkin_saved', onCheckin);
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-xl px-4 py-3 animate-pulse"
        style={{ background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.12)', height: '52px' }}
      />
    );
  }

  if (!mission) return null;

  return (
    <div
      className="rounded-xl px-4 py-3 fade-in"
      style={{ background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.2)' }}
    >
      <div className="flex items-start gap-2.5">
        <span style={{ color: '#8B0000', fontSize: '0.7rem', fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0, marginTop: '1px' }}>
          Mission
        </span>
        <p
          style={{
            flex: 1,
            fontSize: '0.75rem',
            color: '#C9C9C9',
            lineHeight: 1.55,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontStyle: 'italic',
          }}
        >
          {refreshing ? (
            <span style={{ color: '#4A4A68' }}>Updating…</span>
          ) : mission}
        </p>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          title="Refresh mission"
          style={{
            flexShrink: 0,
            background: 'transparent',
            border: 'none',
            cursor: refreshing ? 'default' : 'pointer',
            color: '#3A3A50',
            fontSize: '0.7rem',
            padding: '0 2px',
            opacity: refreshing ? 0.4 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          ↺
        </button>
      </div>
    </div>
  );
}
