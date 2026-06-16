import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Map common action phrases to app routes
function resolveActionRoute(action) {
  if (!action) return null;
  const a = action.toLowerCase();
  if (a.includes('calendar') || a.includes('plan my day') || a.includes('day plan') || a.includes('schedule')) return '/calendar';
  if (a.includes('initiative') || a.includes('goal') || a.includes('set goal') || a.includes('add goal')) return '/initiatives';
  if (a.includes('check-in') || a.includes('checkin') || a.includes('log today')) return '/?checkin=1';
  if (a.includes('history') || a.includes('trend') || a.includes('pattern')) return '/history';
  if (a.includes('digest') || a.includes('weekly')) return '/digest';
  if (a.includes('pattern') || a.includes('launch')) return '/patterns';
  return null;
}

const PRIORITY_STYLE = {
  high:   { dot: '#F87171', border: 'rgba(248,113,113,0.15)', bg: 'rgba(248,113,113,0.04)' },
  medium: { dot: '#FBBF24', border: 'rgba(251,191,36,0.15)',  bg: 'rgba(251,191,36,0.04)'  },
  low:    { dot: '#60A5FA', border: 'rgba(96,165,250,0.15)',  bg: 'rgba(96,165,250,0.04)'  },
};

function InsightCard({ insight, index }) {
  const navigate = useNavigate();
  const s = PRIORITY_STYLE[insight.priority] || PRIORITY_STYLE.low;
  const route = resolveActionRoute(insight.action);

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
          <button
            onClick={() => route && navigate(route)}
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
              cursor: route ? 'pointer' : 'default',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { if (route) { e.currentTarget.style.background = 'rgba(139,0,0,0.2)'; e.currentTarget.style.borderColor = 'rgba(139,0,0,0.4)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,0,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(139,0,0,0.2)'; }}
          >
            → {insight.action}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResearchCard({ item, index }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const tactics = Array.isArray(item.key_tactics) ? item.key_tactics : [];

  return (
    <div
      className="rounded-xl p-4 fade-in"
      style={{
        background: 'rgba(99,102,241,0.04)',
        border: '1px solid rgba(99,102,241,0.15)',
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div className="flex items-start gap-3">
        <span style={{ fontSize: '1.1rem', lineHeight: 1, marginTop: '2px', flexShrink: 0 }}>🔬</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#818CF8' }}
            />
            <p
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: '#818CF8',
                fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Research · {item.initiative_name}
            </p>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#5A5A72', lineHeight: 1.5, marginBottom: '8px' }}>
            {item.summary}
          </p>

          {expanded && tactics.length > 0 && (
            <div
              className="mb-3 rounded-lg p-3 space-y-1.5"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' }}
            >
              {tactics.map((t, i) => (
                <p key={i} style={{ fontSize: '0.67rem', color: '#7A7A92', lineHeight: 1.5 }}>
                  <span style={{ color: '#818CF8', marginRight: '6px' }}>→</span>
                  {t}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            {tactics.length > 0 && (
              <button
                onClick={() => setExpanded(x => !x)}
                style={{
                  fontSize: '0.62rem',
                  color: '#6366F1',
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontFamily: 'DM Mono, monospace',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
              >
                {expanded ? '↑ Hide tactics' : `↓ ${tactics.length} tactics`}
              </button>
            )}
            <button
              onClick={() => navigate('/initiatives')}
              style={{
                fontSize: '0.62rem',
                color: '#4A4A68',
                background: 'transparent',
                border: 'none',
                fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                padding: '2px 0',
              }}
            >
              → View initiative
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntelligenceFeed({ compact = false }) {
  const [insights, setInsights] = useState([]);
  const [research, setResearch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringResearch, setTriggeringResearch] = useState(false);

  const fetchInsights = (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    Promise.all([
      axios.get(`/api/intelligence/feed${force ? '?force=1' : ''}`).catch(() => ({ data: { insights: [] } })),
      axios.get('/api/intelligence/research').catch(() => ({ data: { research: [] } })),
    ]).then(([feedRes, researchRes]) => {
      setInsights(feedRes.data.insights || []);
      setResearch(researchRes.data.research || []);
    }).finally(() => { setLoading(false); setRefreshing(false); });
  };

  const triggerResearch = async () => {
    setTriggeringResearch(true);
    try {
      await axios.post('/api/intelligence/research/trigger');
      setTimeout(() => {
        axios.get('/api/intelligence/research')
          .then(r => setResearch(r.data.research || []))
          .finally(() => setTriggeringResearch(false));
      }, 4000);
    } catch {
      setTriggeringResearch(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    const onCheckin = () => fetchInsights(true);
    window.addEventListener('patternos:checkin_saved', onCheckin);
    return () => window.removeEventListener('patternos:checkin_saved', onCheckin);
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

  if (insights.length === 0 && research.length === 0) return null;

  return (
    <div>
      <div className="space-y-2">
        {insights.slice(0, compact ? 2 : 3).map((ins, i) => (
          <InsightCard key={i} insight={ins} index={i} />
        ))}
        {!compact && research.slice(0, 2).map((item, i) => (
          <ResearchCard key={item.id} item={item} index={insights.length + i} />
        ))}
      </div>

      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          style={{
            fontSize: '0.56rem',
            color: refreshing ? '#3A3A50' : '#4A4A68',
            fontFamily: 'DM Mono, monospace',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: 'transparent',
            border: 'none',
            cursor: refreshing ? 'default' : 'pointer',
            padding: '2px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.15s',
          }}
        >
          <span className={refreshing ? 'animate-spin' : ''} style={{ display: 'inline-block' }}>↺</span>
          {refreshing ? 'Refreshing…' : 'Refresh insights'}
        </button>

        {!compact && (
          <button
            onClick={triggerResearch}
            disabled={triggeringResearch}
            style={{
              fontSize: '0.56rem',
              color: triggeringResearch ? '#3A3A50' : '#6366F1',
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: 'none',
              cursor: triggeringResearch ? 'default' : 'pointer',
              padding: '2px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.15s',
            }}
          >
            <span className={triggeringResearch ? 'animate-spin' : ''} style={{ display: 'inline-block' }}>🔬</span>
            {triggeringResearch ? 'Researching…' : 'Research initiatives'}
          </button>
        )}
      </div>
    </div>
  );
}
