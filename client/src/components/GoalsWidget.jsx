import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const DOMAIN_COLORS = {
  physical: '#22C55E',
  mental:   '#60A5FA',
  financial:'#FBBF24',
  spiritual:'#C084FC',
  personal: '#94A3B8',
};

function GoalRow({ goal }) {
  const color = DOMAIN_COLORS[goal.domain] || '#5A5A72';
  const pct = goal.target_value > 0
    ? Math.min(100, Math.round((parseFloat(goal.current_value) / parseFloat(goal.target_value)) * 100))
    : 0;
  const isComplete = goal.completed === 1 || goal.completed === true;

  return (
    <div className="py-2" style={{ borderBottom: '1px solid rgba(37,37,64,0.4)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span
          style={{
            fontSize: '0.72rem',
            color: isComplete ? '#22C55E' : '#C9C9C9',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginRight: '8px',
            textDecoration: isComplete ? 'line-through' : 'none',
          }}
        >
          {goal.title}
        </span>
        <span style={{ fontSize: '0.62rem', color: pct >= 100 ? '#22C55E' : color, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
          {parseFloat(goal.current_value) || 0} / {parseFloat(goal.target_value)} {goal.target_label || goal.metric}
        </span>
      </div>
      <div style={{ height: '2px', borderRadius: '1px', background: 'rgba(37,37,64,0.8)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: '1px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export default function GoalsWidget() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(() => {
    axios.get('/api/goals')
      .then(r => {
        const isTrue = v => v === true || v === 1 || v === '1' || v === 't';
        const active = (r.data || []).filter(g => isTrue(g.active) && !isTrue(g.completed));
        setGoals(active.slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGoals();
    window.addEventListener('patternos:checkin_saved', fetchGoals);
    window.addEventListener('patternos:goals_updated', fetchGoals);
    return () => {
      window.removeEventListener('patternos:checkin_saved', fetchGoals);
      window.removeEventListener('patternos:goals_updated', fetchGoals);
    };
  }, [fetchGoals]);

  if (loading) {
    return (
      <div className="rounded-xl p-4" style={{ background: 'rgba(20,20,36,0.6)', border: '1px solid #252540' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'rgba(37,37,64,0.6)' }} />
          <div className="h-3 w-12 rounded animate-pulse" style={{ background: 'rgba(37,37,64,0.4)' }} />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i}>
              <div className="flex justify-between mb-1.5">
                <div className="h-3 rounded animate-pulse" style={{ background: 'rgba(37,37,64,0.5)', width: `${60 + i * 10}%` }} />
                <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'rgba(37,37,64,0.4)' }} />
              </div>
              <div className="h-0.5 rounded animate-pulse" style={{ background: 'rgba(37,37,64,0.5)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(20,20,36,0.6)', border: '1px solid #252540' }}>
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize: '0.7rem', color: '#4A4A68', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
          Active Goals
        </p>
        <button
          onClick={() => navigate('/initiatives')}
          style={{ fontSize: '0.6rem', color: '#8B0000', fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em' }}
          className="hover:opacity-80 transition-opacity uppercase"
        >
          {goals.length === 0 ? 'Add →' : 'Manage →'}
        </button>
      </div>

      {goals.length === 0 ? (
        <div
          className="rounded-lg px-3 py-4 text-center cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: 'rgba(139,0,0,0.06)', border: '1px dashed rgba(139,0,0,0.2)' }}
          onClick={() => navigate('/initiatives')}
        >
          <p style={{ fontSize: '0.68rem', color: '#4A4A68' }}>No active goals</p>
          <p style={{ fontSize: '0.62rem', color: '#8B0000', fontFamily: 'DM Mono, monospace', marginTop: '2px', letterSpacing: '0.06em' }}>
            → SET GOALS
          </p>
        </div>
      ) : (
        <div>
          {goals.map(g => <GoalRow key={g.id} goal={g} />)}
        </div>
      )}
    </div>
  );
}
