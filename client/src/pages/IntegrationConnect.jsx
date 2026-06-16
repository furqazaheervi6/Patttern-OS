import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const KEY_INTEGRATIONS = [
  { name: 'google_calendar', label: 'Google Calendar', icon: '📅', kind: 'oauth' },
  { name: 'notion',          label: 'Notion',          icon: '◻',  kind: 'api'   },
  { name: 'perplexity',      label: 'Perplexity',      icon: '◈',  kind: 'api'   },
  { name: 'anthropic',       label: 'Claude AI',        icon: '◎',  kind: 'api'   },
  { name: 'openai',          label: 'OpenAI',           icon: '⬡',  kind: 'api'   },
];

function StatusDot({ status }) {
  const map = {
    connected:    { color: '#22C55E', label: 'Connected'    },
    configured:   { color: '#22C55E', label: 'Connected'    },
    connecting:   { color: '#FBBF24', label: 'Connecting…'  },
    checking:     { color: '#5A5A72', label: 'Checking…'    },
    unconfigured: { color: '#252540', label: 'Not set up'   },
    failed:       { color: '#F87171', label: 'Not connected' },
    skipped:      { color: '#5A5A72', label: 'Skipped'      },
  };
  const s = map[status] || map.unconfigured;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full"
        style={{
          background: s.color,
          boxShadow: status === 'connecting' ? `0 0 6px ${s.color}` : 'none',
          animation: status === 'connecting' ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      />
      <span className="text-xs" style={{ color: s.color === '#252540' ? '#5A5A72' : s.color }}>
        {s.label}
      </span>
    </div>
  );
}

export default function IntegrationConnect() {
  const navigate = useNavigate();
  const [gcalStatus, setGcalStatus]     = useState('checking');
  const [apiStatuses, setApiStatuses]   = useState({});
  const [autoRedirect, setAutoRedirect] = useState(false);
  const popupRef  = useRef(null);
  const pollRef   = useRef(null);
  const timerRef  = useRef(null);

  // Fetch API-key integration statuses
  useEffect(() => {
    axios.get('/api/integrations').then(r => {
      const map = {};
      for (const int of r.data) {
        if (KEY_INTEGRATIONS.find(k => k.name === int.name && k.kind === 'api')) {
          map[int.name] = (int.status === 'connected' || int.status === 'configured') ? 'connected' : int.status;
        }
      }
      setApiStatuses(map);
    }).catch(() => {});
  }, []);

  // Listen for postMessage from the OAuth popup
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'gcal_connected') {
        setGcalStatus('connected');
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Check GCal and auto-open popup if needed
  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get('/api/google/status');
        if (r.data.authorized) {
          setGcalStatus('connected');
        } else {
          openGcalPopup();
        }
      } catch {
        setGcalStatus('failed');
      }
    })();
  }, []);

  // Auto-redirect to / when GCal is connected
  useEffect(() => {
    if (gcalStatus === 'connected') {
      setAutoRedirect(true);
      timerRef.current = setTimeout(() => navigate('/'), 1500);
    }
  }, [gcalStatus, navigate]);

  const openGcalPopup = () => {
    setGcalStatus('connecting');
    const w = 520, h = 640;
    const left = Math.round(window.screenX + (window.outerWidth  - w) / 2);
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
    const popup = window.open('/api/google/auth', 'gcal_oauth',
      `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0`);
    popupRef.current = popup;

    pollRef.current = setInterval(async () => {
      try {
        const r = await axios.get('/api/google/status');
        if (r.data.authorized) {
          setGcalStatus('connected');
          clearInterval(pollRef.current); pollRef.current = null;
          return;
        }
      } catch {}
      if (popupRef.current?.closed) {
        setGcalStatus(prev => prev === 'connecting' ? 'skipped' : prev);
        clearInterval(pollRef.current); pollRef.current = null;
      }
    }, 1500);
  };

  const statuses = {
    google_calendar: gcalStatus,
    ...apiStatuses,
  };

  const allDone = gcalStatus === 'connected' || gcalStatus === 'skipped' || gcalStatus === 'failed';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(139,0,0,0.08) 0%, rgba(8,14,28,1) 70%)' }}
    >
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn .35s ease both; }
      `}</style>

      <div className="w-full max-w-sm fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span style={{ color: '#8B0000', fontSize: '1.5rem' }}>◎</span>
            <span style={{ fontFamily: 'Cinzel, Georgia, serif', fontWeight: 700, fontSize: '1.1rem', color: '#C9C9C9', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              PatternOS
            </span>
          </div>
          <p className="text-xs text-text-muted" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
            Connecting your integrations
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-5">

          {/* GCal status banner */}
          {gcalStatus === 'connecting' && (
            <div className="rounded-xl px-4 py-3 text-sm text-center fade-in"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#FBBF24' }}>
              <span
                className="inline-block w-3 h-3 rounded-full border-2 mr-2"
                style={{ borderColor: '#FBBF24', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', display: 'inline-block', verticalAlign: 'middle' }}
              />
              Sign in to Google Calendar in the popup window…
            </div>
          )}

          {gcalStatus === 'connected' && (
            <div className="rounded-xl px-4 py-3 text-sm text-center fade-in"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ADE80' }}>
              ✓ All integrations synced — taking you in{autoRedirect ? '…' : ''}
            </div>
          )}

          {gcalStatus === 'skipped' && (
            <div className="rounded-xl px-4 py-3 text-sm text-center fade-in"
              style={{ background: 'rgba(90,90,114,0.12)', border: '1px solid rgba(90,90,114,0.25)', color: '#9CA3AF' }}>
              Google Calendar skipped — you can connect it in Settings
            </div>
          )}

          {/* Integration list */}
          <div className="space-y-2">
            {KEY_INTEGRATIONS.map(({ name, label, icon }) => (
              <div
                key={name}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border"
                style={{ borderColor: '#252540', background: 'rgba(8,14,28,0.4)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base w-5 text-center">{icon}</span>
                  <span className="text-sm text-text-primary">{label}</span>
                </div>
                <StatusDot status={statuses[name] || 'unconfigured'} />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-1 space-y-2">
            {gcalStatus === 'skipped' || gcalStatus === 'failed' ? (
              <button
                onClick={openGcalPopup}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#93C5FD' }}
              >
                📅 Retry Google Calendar
              </button>
            ) : null}

            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}
            >
              {gcalStatus === 'connected' ? 'Enter PatternOS →' : allDone ? 'Continue →' : 'Skip for now →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
