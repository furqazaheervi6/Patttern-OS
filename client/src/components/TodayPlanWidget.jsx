import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';

const PILLAR_COLORS = {
  physical: '#22C55E',
  mental:   '#60A5FA',
  financial:'#FBBF24',
  spiritual:'#C084FC',
  personal: '#94A3B8',
};

function timeToMinutes(t) {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function BlockRow({ block }) {
  const color = PILLAR_COLORS[block.pillar] || '#94A3B8';
  const now = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();
  const startMin = timeToMinutes(block.start);
  const endMin = timeToMinutes(block.end);
  const isActive = curMin >= startMin && curMin < endMin;
  const isPast = curMin >= endMin;

  return (
    <div
      className="flex items-center gap-2.5 py-1.5 transition-all"
      style={{ opacity: isPast ? 0.45 : 1 }}
    >
      <div
        className="w-0.5 rounded-full self-stretch"
        style={{ background: color, minHeight: '24px', flexShrink: 0 }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isActive && (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
              style={{ background: color }}
            />
          )}
          <span
            style={{
              fontSize: '0.7rem',
              color: isActive ? '#C9C9C9' : '#7A7A92',
              fontWeight: isActive ? 600 : 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {block.title}
          </span>
        </div>
      </div>
      <span
        style={{
          fontSize: '0.6rem',
          color: '#3A3A50',
          fontFamily: 'DM Mono, monospace',
          flexShrink: 0,
        }}
      >
        {block.start}
      </span>
    </div>
  );
}

function loadLocalPlan(date) {
  try {
    const plan = JSON.parse(localStorage.getItem('patternos_dayplan') || '{}');
    return plan[date] || [];
  } catch {
    return [];
  }
}

export default function TodayPlanWidget() {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [blocks, setBlocks] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = React.useCallback(() => {
    const local = loadLocalPlan(today);
    if (local.length > 0) {
      setBlocks(local);
      setLoading(false);
      return;
    }
    axios.get(`/api/calendar/blocks?date=${today}`)
      .then(r => setBlocks(r.data.blocks || []))
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false));
  }, [today]);

  useEffect(() => {
    // Prefer localStorage (kept in sync by Calendar + ChatBot) for instant load.
    // Fall back to API if localStorage is empty (e.g. plan generated on another device).
    reload();

    // React to plan changes dispatched by ChatBot or Calendar
    window.addEventListener('patternos:planactions', reload);
    // React to plan changes in another tab
    const onStorage = (e) => { if (e.key === 'patternos_dayplan') reload(); };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('patternos:planactions', reload);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  const now = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();

  // Show upcoming + currently active blocks
  const upcoming = (blocks || [])
    .filter(b => timeToMinutes(b.end) > curMin - 30)
    .slice(0, 5);

  const done = (blocks || []).filter(b => timeToMinutes(b.end) <= curMin).length;
  const total = (blocks || []).length;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(20,20,36,0.6)', border: '1px solid #252540' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '0.7rem', color: '#5A5A72', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
            Today's Plan
          </span>
          {total > 0 && (
            <span
              style={{
                fontSize: '0.6rem',
                color: '#4A4A68',
                background: 'rgba(37,37,64,0.8)',
                border: '1px solid #252540',
                padding: '1px 6px',
                borderRadius: '4px',
                fontFamily: 'DM Mono, monospace',
              }}
            >
              {done}/{total}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/calendar')}
          style={{ fontSize: '0.62rem', color: '#8B0000', fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em' }}
          className="hover:opacity-80 transition-opacity uppercase"
        >
          {total === 0 ? 'Plan →' : 'View →'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-6 rounded animate-pulse" style={{ background: 'rgba(37,37,64,0.4)' }} />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <div
          className="rounded-lg px-3 py-4 text-center cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: 'rgba(139,0,0,0.06)', border: '1px dashed rgba(139,0,0,0.2)' }}
          onClick={() => navigate('/calendar')}
        >
          <p style={{ fontSize: '0.7rem', color: '#5A5A72', marginBottom: '4px' }}>No plan generated yet</p>
          <p style={{ fontSize: '0.65rem', color: '#8B0000', fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em' }}>
            → PLAN MY DAY
          </p>
        </div>
      ) : (
        <div>
          {upcoming.map(b => <BlockRow key={b.id} block={b} />)}
          {total > 5 && (
            <p style={{ fontSize: '0.62rem', color: '#3A3A50', marginTop: '6px', textAlign: 'center', fontFamily: 'DM Mono, monospace' }}>
              +{total - 5} more blocks
            </p>
          )}
        </div>
      )}
    </div>
  );
}
