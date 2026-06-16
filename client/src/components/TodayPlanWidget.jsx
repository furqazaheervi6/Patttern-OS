import React, { useState, useEffect, useCallback } from 'react';
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

function BlockRow({ block, onComplete, onSkip, onUncomplete }) {
  const color = PILLAR_COLORS[block.pillar] || '#94A3B8';
  const now = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();
  const startMin = timeToMinutes(block.start);
  const endMin = timeToMinutes(block.end);
  const isActive = curMin >= startMin && curMin < endMin;

  const isCompleted = !!block.completed_at;
  const isSkipped = !!block.skipped_at;
  const isDone = isCompleted || isSkipped;

  return (
    <div
      className="flex items-center gap-2 py-1.5 group transition-all"
      style={{ opacity: isDone ? 0.5 : 1 }}
    >
      <div
        className="w-0.5 rounded-full self-stretch flex-shrink-0"
        style={{ background: isCompleted ? '#22C55E' : isSkipped ? '#EF4444' : color, minHeight: '22px' }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isActive && !isDone && (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
              style={{ background: color }}
            />
          )}
          <span
            style={{
              fontSize: '0.68rem',
              color: isCompleted ? '#22C55E' : isSkipped ? '#EF4444' : isActive ? '#C9C9C9' : '#7A7A92',
              fontWeight: isActive && !isDone ? 600 : 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textDecoration: isSkipped ? 'line-through' : 'none',
            }}
          >
            {block.title}
          </span>
        </div>
      </div>

      <span
        style={{
          fontSize: '0.58rem',
          color: '#3A3A50',
          fontFamily: 'DM Mono, monospace',
          flexShrink: 0,
          marginRight: '4px',
        }}
      >
        {block.start}
      </span>

      {/* Action buttons — show on hover or when already done */}
      <div className={`flex items-center gap-0.5 flex-shrink-0 ${isDone ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        {isDone ? (
          <button
            onClick={() => onUncomplete(block.id)}
            title="Undo"
            style={{
              fontSize: '0.58rem',
              color: '#3A3A50',
              background: 'rgba(37,37,64,0.6)',
              border: '1px solid #252540',
              borderRadius: '3px',
              padding: '1px 4px',
              cursor: 'pointer',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            ↩
          </button>
        ) : (
          <>
            <button
              onClick={() => onComplete(block.id)}
              title="Mark done"
              style={{
                fontSize: '0.58rem',
                color: '#22C55E',
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: '3px',
                padding: '1px 4px',
                cursor: 'pointer',
                fontFamily: 'DM Mono, monospace',
              }}
            >
              ✓
            </button>
            <button
              onClick={() => onSkip(block.id)}
              title="Skip"
              style={{
                fontSize: '0.58rem',
                color: '#EF4444',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '3px',
                padding: '1px 4px',
                cursor: 'pointer',
                fontFamily: 'DM Mono, monospace',
              }}
            >
              ✕
            </button>
          </>
        )}
      </div>
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

  const fetchFromApi = useCallback(() => {
    return axios.get(`/api/calendar/blocks?date=${today}`)
      .then(r => {
        const apiBlocks = r.data.blocks || [];
        setBlocks(apiBlocks);
        return apiBlocks;
      })
      .catch(() => {
        setBlocks([]);
        return [];
      })
      .finally(() => setLoading(false));
  }, [today]);

  const reload = useCallback(() => {
    const local = loadLocalPlan(today);
    if (local.length > 0) {
      // Prefer API blocks to get completion state, fall back to local if API fails
      axios.get(`/api/calendar/blocks?date=${today}`)
        .then(r => {
          const apiBlocks = r.data.blocks || [];
          if (apiBlocks.length > 0) {
            setBlocks(apiBlocks);
          } else {
            setBlocks(local);
          }
        })
        .catch(() => setBlocks(local))
        .finally(() => setLoading(false));
    } else {
      fetchFromApi();
    }
  }, [today, fetchFromApi]);

  useEffect(() => {
    reload();
    window.addEventListener('patternos:planactions', reload);
    const onStorage = (e) => { if (e.key === 'patternos_dayplan') reload(); };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('patternos:planactions', reload);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  const handleComplete = async (blockId) => {
    setBlocks(prev => prev?.map(b => b.id === blockId ? { ...b, completed_at: new Date().toISOString(), skipped_at: null } : b));
    try {
      await axios.patch(`/api/calendar/blocks/${blockId}/complete`);
    } catch {
      reload();
    }
  };

  const handleSkip = async (blockId) => {
    setBlocks(prev => prev?.map(b => b.id === blockId ? { ...b, skipped_at: new Date().toISOString(), completed_at: null } : b));
    try {
      await axios.patch(`/api/calendar/blocks/${blockId}/skip`);
    } catch {
      reload();
    }
  };

  const handleUncomplete = async (blockId) => {
    setBlocks(prev => prev?.map(b => b.id === blockId ? { ...b, completed_at: null, skipped_at: null } : b));
    try {
      await axios.patch(`/api/calendar/blocks/${blockId}/uncomplete`);
    } catch {
      reload();
    }
  };

  const now = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();

  const upcoming = (blocks || [])
    .filter(b => timeToMinutes(b.end) > curMin - 30)
    .slice(0, 5);

  const completed = (blocks || []).filter(b => b.completed_at).length;
  const skipped = (blocks || []).filter(b => b.skipped_at).length;
  const total = (blocks || []).length;
  const done = completed + skipped;

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
                color: completed > 0 ? '#22C55E' : '#4A4A68',
                background: completed > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(37,37,64,0.8)',
                border: `1px solid ${completed > 0 ? 'rgba(34,197,94,0.2)' : '#252540'}`,
                padding: '1px 6px',
                borderRadius: '4px',
                fontFamily: 'DM Mono, monospace',
              }}
            >
              {completed}/{total}
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
          {upcoming.map(b => (
            <BlockRow
              key={b.id}
              block={b}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onUncomplete={handleUncomplete}
            />
          ))}
          {total > 5 && (
            <p style={{ fontSize: '0.62rem', color: '#3A3A50', marginTop: '6px', textAlign: 'center', fontFamily: 'DM Mono, monospace' }}>
              +{total - 5} more blocks
            </p>
          )}
          {done > 0 && (
            <div
              className="mt-2 pt-2"
              style={{ borderTop: '1px solid #1A1A30' }}
            >
              <p style={{ fontSize: '0.6rem', color: '#3A3A50', fontFamily: 'DM Mono, monospace', textAlign: 'right' }}>
                {completed > 0 && <span style={{ color: '#22C55E' }}>{completed} done</span>}
                {completed > 0 && skipped > 0 && <span style={{ color: '#3A3A50' }}> · </span>}
                {skipped > 0 && <span style={{ color: '#EF4444' }}>{skipped} skipped</span>}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
