import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, addDays } from 'date-fns';

const PILLAR_COLORS = {
  physical: '#22C55E',
  mental: '#60A5FA',
  financial: '#FBBF24',
  spiritual: '#C084FC',
  personal: '#94A3B8',
};

const CATEGORY_STYLES = {
  operator:  { bg: 'rgba(139,0,0,0.08)',    border: 'rgba(139,0,0,0.2)',    label: '#8B0000'  },
  health:    { bg: 'rgba(34,197,94,0.06)',   border: 'rgba(34,197,94,0.2)',  label: '#22C55E'  },
  spirit:    { bg: 'rgba(192,132,252,0.06)', border: 'rgba(192,132,252,0.2)',label: '#C084FC'  },
  content:   { bg: 'rgba(96,165,250,0.06)',  border: 'rgba(96,165,250,0.2)', label: '#60A5FA'  },
  default:   { bg: 'rgba(37,37,64,0.4)',     border: '#252540',              label: '#5A5A72'  },
};

function getCategoryStyle(cat) {
  if (!cat) return CATEGORY_STYLES.default;
  const k = cat.toLowerCase();
  if (k.includes('operator') || k.includes('revenue') || k.includes('launch') || k.includes('yc')) return CATEGORY_STYLES.operator;
  if (k.includes('health') || k.includes('fitness') || k.includes('physical')) return CATEGORY_STYLES.health;
  if (k.includes('spirit') || k.includes('mindful')) return CATEGORY_STYLES.spirit;
  if (k.includes('content') || k.includes('brand')) return CATEGORY_STYLES.content;
  return CATEGORY_STYLES.default;
}

function PatternCard({ pattern, onLaunch }) {
  const cs = getCategoryStyle(pattern.category);
  const emphasisArr = Array.isArray(pattern.pillar_emphasis)
    ? pattern.pillar_emphasis
    : [pattern.pillar_emphasis].filter(Boolean);
  const emphasisColors = emphasisArr.map(p => PILLAR_COLORS[p] || '#5A5A72');

  return (
    <div
      className="rounded-2xl p-5 fade-in flex flex-col gap-4 transition-all hover:scale-[1.01]"
      style={{ background: 'rgba(20,20,36,0.7)', border: '1px solid #252540', cursor: 'default' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 }}>{pattern.icon}</span>
          <div>
            <h3 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '0.85rem', fontWeight: 700, color: '#C9C9C9', letterSpacing: '0.08em', lineHeight: 1.2 }}>
              {pattern.name}
            </h3>
            <span
              style={{
                display: 'inline-block',
                marginTop: '4px',
                fontSize: '0.58rem',
                color: cs.label,
                background: cs.bg,
                border: `1px solid ${cs.border}`,
                padding: '1px 7px',
                borderRadius: '4px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'DM Mono, monospace',
              }}
            >
              {pattern.category}
            </span>
          </div>
        </div>
        <span style={{ fontSize: '0.65rem', color: '#3A3A50', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
          {pattern.duration_weeks}w
        </span>
      </div>

      <p style={{ fontSize: '0.72rem', color: '#5A5A72', lineHeight: 1.55 }}>
        {pattern.description}
      </p>

      <div className="flex items-center gap-1.5">
        {emphasisColors.map((c, i) => (
          <span
            key={i}
            style={{ width: '6px', height: '6px', borderRadius: '50%', background: c, opacity: 0.9 }}
          />
        ))}
        {emphasisArr.length > 0 && (
          <span style={{ fontSize: '0.6rem', color: '#3A3A50', marginLeft: '2px', fontFamily: 'DM Mono, monospace' }}>
            {emphasisArr.join(' · ')}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: '1px solid #1A1A2E' }}>
        <span style={{ fontSize: '0.65rem', color: '#3A3A50', fontFamily: 'DM Mono, monospace' }}>
          {pattern.milestone_count} milestones
        </span>
        <button
          onClick={() => onLaunch(pattern)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #8B0000, #B22222)',
            color: '#D4D4D8',
            fontFamily: 'Cinzel, Georgia, serif',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontSize: '0.62rem',
          }}
        >
          ◈ Launch
        </button>
      </div>
    </div>
  );
}

function LaunchModal({ pattern, onClose, onLaunched }) {
  const [name, setName] = useState(pattern.name);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');

  const endDate = addDays(new Date(startDate + 'T00:00:00'), (pattern.duration_weeks || 4) * 7 - 1);

  async function handleLaunch() {
    setLaunching(true);
    setError('');
    try {
      await axios.post(`/api/patterns/${pattern.id}/launch`, { custom_name: name, start_date: startDate });
      onLaunched();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to launch pattern');
      setLaunching(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div
        className="rounded-2xl p-6 w-full max-w-md fade-in"
        style={{ background: '#0D0D16', border: '1px solid #2E2E48' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <span style={{ fontSize: '1.6rem' }}>{pattern.icon}</span>
          <div>
            <h2 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1rem', fontWeight: 700, color: '#C9C9C9', letterSpacing: '0.1em' }}>
              Launch Pattern
            </h2>
            <p style={{ fontSize: '0.7rem', color: '#5A5A72', marginTop: '2px' }}>{pattern.name}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label style={{ fontSize: '0.65rem', color: '#4A4A68', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', display: 'block', marginBottom: '6px' }}>
              Initiative Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
              style={{ background: 'rgba(37,37,64,0.6)', border: '1px solid #252540', color: '#C9C9C9', fontFamily: 'Inter, sans-serif' }}
              onFocus={e => { e.target.style.borderColor = '#8B0000'; }}
              onBlur={e => { e.target.style.borderColor = '#252540'; }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.65rem', color: '#4A4A68', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', display: 'block', marginBottom: '6px' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
              style={{ background: 'rgba(37,37,64,0.6)', border: '1px solid #252540', color: '#C9C9C9', fontFamily: 'DM Mono, monospace', colorScheme: 'dark' }}
              onFocus={e => { e.target.style.borderColor = '#8B0000'; }}
              onBlur={e => { e.target.style.borderColor = '#252540'; }}
            />
          </div>

          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.15)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: '0.65rem', color: '#5A5A72', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
                Summary
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span style={{ fontSize: '0.68rem', color: '#4A4A68' }}>Duration</span>
                <span style={{ fontSize: '0.68rem', color: '#C9C9C9', fontFamily: 'DM Mono, monospace' }}>{pattern.duration_weeks} weeks</span>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: '0.68rem', color: '#4A4A68' }}>End Date</span>
                <span style={{ fontSize: '0.68rem', color: '#C9C9C9', fontFamily: 'DM Mono, monospace' }}>{format(endDate, 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: '0.68rem', color: '#4A4A68' }}>Milestones</span>
                <span style={{ fontSize: '0.68rem', color: '#C9C9C9', fontFamily: 'DM Mono, monospace' }}>{pattern.milestone_count}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: '0.68rem', color: '#4A4A68' }}>Domain</span>
                <span style={{ fontSize: '0.68rem', color: '#C9C9C9', fontFamily: 'DM Mono, monospace' }}>{pattern.domain || '—'}</span>
              </div>
            </div>
          </div>

          {error && (
            <p style={{ fontSize: '0.7rem', color: '#F87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
            style={{ border: '1px solid #252540', color: '#5A5A72' }}
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={launching || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #8B0000, #B22222)',
              color: '#D4D4D8',
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {launching ? '◎ Launching...' : '◈ Launch Pattern'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Patterns() {
  const navigate = useNavigate();
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    axios.get('/api/patterns')
      .then(r => setPatterns(r.data.patterns || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleLaunched() {
    setSelected(null);
    setLaunched(true);
    setTimeout(() => navigate('/initiatives'), 1200);
  }

  return (
    <div className="page-container">
      <div className="flex items-start justify-between mb-6 fade-in">
        <div>
          <h1 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color: '#C9C9C9', letterSpacing: '0.15em', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: '6px' }}>
            Patterns
          </h1>
          <p style={{ fontSize: '0.65rem', color: '#3A3A50', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
            Pre-built execution playbooks
          </p>
        </div>
        <button
          onClick={() => navigate('/initiatives')}
          style={{ fontSize: '0.62rem', color: '#5A5A72', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em' }}
          className="hover:opacity-80 transition-opacity uppercase"
        >
          View Initiatives →
        </button>
      </div>

      {launched && (
        <div
          className="rounded-2xl p-4 mb-6 fade-in flex items-center gap-3"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <span style={{ fontSize: '1rem', color: '#22C55E' }}>✓</span>
          <p style={{ fontSize: '0.75rem', color: '#22C55E', fontFamily: 'DM Mono, monospace', letterSpacing: '0.05em' }}>
            Pattern launched — redirecting to Initiatives...
          </p>
        </div>
      )}

      <div
        className="rounded-2xl p-4 mb-6 fade-in"
        style={{ background: 'rgba(139,0,0,0.04)', border: '1px solid rgba(139,0,0,0.12)' }}
      >
        <div className="flex items-start gap-3">
          <span style={{ fontSize: '1.1rem', color: '#8B0000', flexShrink: 0 }}>◈</span>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#C9C9C9', fontWeight: 600, marginBottom: '4px' }}>
              What are Patterns?
            </p>
            <p style={{ fontSize: '0.7rem', color: '#5A5A72', lineHeight: 1.55 }}>
              Patterns are structured execution playbooks — each one deploys an initiative with pre-built milestones, timelines, and daily actions mapped to your pillars. Launch one to activate a proven operating protocol.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="rounded-2xl h-52 animate-pulse" style={{ background: 'rgba(37,37,64,0.3)' }} />
          ))}
        </div>
      ) : patterns.length === 0 ? (
        <div className="text-center py-20">
          <p style={{ fontSize: '0.8rem', color: '#3A3A50' }}>No patterns available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patterns.map(p => (
            <PatternCard key={p.id} pattern={p} onLaunch={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <LaunchModal
          pattern={selected}
          onClose={() => setSelected(null)}
          onLaunched={handleLaunched}
        />
      )}
    </div>
  );
}
