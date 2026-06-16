import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';

const STEPS = [
  { id: 'welcome',    label: 'Welcome',   icon: '◎' },
  { id: 'mode',       label: 'Your Mode', icon: '◈' },
  { id: 'calendar',   label: 'Calendar',  icon: '◷' },
  { id: 'goal',       label: 'First Goal',icon: '◎' },
  { id: 'ready',      label: 'Ready',     icon: '✦' },
];

const DOMAINS = [
  { id: 'physical',  label: 'Physical',  color: '#22C55E', icon: '🏋️' },
  { id: 'mental',    label: 'Mental',    color: '#60A5FA', icon: '🧠' },
  { id: 'financial', label: 'Financial', color: '#FBBF24', icon: '💰' },
  { id: 'spiritual', label: 'Spiritual', color: '#C084FC', icon: '🕊️' },
];

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(user?.mode || 'personal');
  const [goal, setGoal] = useState({ title: '', domain: 'financial', target_value: 0, target_label: '' });
  const [saving, setSaving] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalChecking, setGcalChecking] = useState(false);
  const popupRef = useRef(null);
  const pollRef = useRef(null);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Check if already connected when landing on calendar step
  useEffect(() => {
    if (STEPS[step].id === 'calendar') {
      axios.get('/api/google/status').then(r => {
        if (r.data.authorized) setGcalConnected(true);
      }).catch(() => {});
    }
  }, [step]);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'gcal_connected') {
        setGcalConnected(true);
        setGcalChecking(false);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Clean up poll on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const openGcalAuth = () => {
    setGcalChecking(true);
    const w = 520, h = 640;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
    const popup = window.open('/api/google/auth', 'gcal_oauth', `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0`);
    popupRef.current = popup;

    // Poll every 1.5s — detect connection or popup close
    pollRef.current = setInterval(async () => {
      try {
        const r = await axios.get('/api/google/status');
        if (r.data.authorized) {
          setGcalConnected(true);
          setGcalChecking(false);
          clearInterval(pollRef.current);
          pollRef.current = null;
          return;
        }
      } catch {}
      // If user closed popup without connecting
      if (popupRef.current?.closed) {
        setGcalChecking(false);
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 1500);
  };

  const saveMode = async () => {
    setSaving(true);
    try {
      await updateUser({ mode });
    } catch {}
    setSaving(false);
    next();
  };

  const saveGoal = async () => {
    setSaving(true);
    try {
      if (goal.title.trim()) {
        await axios.post('/api/goals', { ...goal, metric: goal.title, priority: 'high', active: 1 });
      }
    } catch {}
    setSaving(false);
    next();
  };

  const finish = async () => {
    setSaving(true);
    try {
      await updateUser({ onboarded: true });
    } catch {}
    setSaving(false);
    navigate('/');
  };

  const stepId = STEPS[step].id;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(139,0,0,0.08) 0%, rgba(8,14,28,1) 70%)' }}
    >
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full text-xs transition-all duration-300"
                style={{
                  background: i <= step ? 'rgba(139,0,0,0.2)' : 'transparent',
                  border: `1px solid ${i <= step ? '#8B0000' : '#252540'}`,
                  color: i <= step ? '#C9C9C9' : '#4A4A68',
                }}
              >
                {i < step ? '✓' : s.icon}
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px transition-all duration-300" style={{ background: i < step ? '#8B0000' : '#252540' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-2xl fade-in">

          {/* ── Welcome ── */}
          {stepId === 'welcome' && (
            <div className="text-center space-y-5">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span style={{ color: '#8B0000', fontSize: '2rem' }}>◎</span>
              </div>
              <h1 className="font-display font-bold text-2xl text-text-primary">
                Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
              </h1>
              <p className="text-sm text-text-muted leading-relaxed max-w-sm mx-auto">
                PatternOS is your AI operating system — it plans your entire day across body, mind, money, and conviction so you execute without friction.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-6 text-left">
                {[
                  { icon: '◷', label: 'AI Day Planner', desc: 'Full 13-hour plan synced to Google Cal' },
                  { icon: '⬡', label: 'Pillar Scoring', desc: 'Physical · Mental · Financial · Spiritual' },
                  { icon: '◈', label: 'Pattern Intelligence', desc: 'Weekly digests & correlations' },
                  { icon: '✦', label: 'Evolutions', desc: 'Long-arc growth tracking by domain' },
                ].map((f) => (
                  <div key={f.label} className="rounded-xl p-3.5 border border-border bg-bg/30">
                    <span className="text-lg">{f.icon}</span>
                    <p className="text-xs font-semibold text-text-primary mt-1.5">{f.label}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={next} className="w-full py-3 rounded-xl font-display font-bold text-sm mt-2" style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}>
                Get Started →
              </button>
            </div>
          )}

          {/* ── Mode selection ── */}
          {stepId === 'mode' && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-xl text-text-primary">How do you operate?</h2>
                <p className="text-sm text-text-muted mt-1.5">This shapes how PatternOS plans your day.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    id: 'personal',
                    icon: '◉',
                    title: 'Personal Mode',
                    description: 'Balanced planning across all life pillars — ideal for anyone building holistic habits and routines.',
                    tags: ['Sleep', 'Exercise', 'Focus', 'Reflection'],
                    color: '#14B8A6',
                  },
                  {
                    id: 'operator',
                    icon: '◎',
                    title: 'Operator Mode',
                    description: 'Execution-first scheduling for founders and operators. Revenue targets, product sprints, conviction blocks, and recovery — all integrated.',
                    tags: ['Revenue', 'Product', 'Pipeline', 'Conviction'],
                    color: '#8B0000',
                    badge: 'YC founders use this',
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="text-left rounded-2xl p-5 border transition-all duration-200"
                    style={{
                      borderColor: mode === m.id ? m.color + '50' : '#252540',
                      background: mode === m.id ? m.color + '08' : 'transparent',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-xl" style={{ color: mode === m.id ? m.color : '#5A5A72' }}>{m.icon}</span>
                        <span className="font-display font-bold text-sm text-text-primary">{m.title}</span>
                      </div>
                      {m.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ color: '#8B0000', background: 'rgba(139,0,0,0.12)', border: '1px solid rgba(139,0,0,0.2)' }}>
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed mb-3">{m.description}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {m.tags.map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-md font-mono" style={{ color: mode === m.id ? m.color : '#5A5A72', background: mode === m.id ? m.color + '15' : 'rgba(37,37,64,0.5)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={back} className="flex-1 py-3 rounded-xl text-sm text-text-muted border border-border hover:text-text-primary transition-colors">
                  Back
                </button>
                <button onClick={saveMode} disabled={saving} className="flex-1 py-3 rounded-xl font-display font-bold text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}>
                  {saving ? '...' : 'Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Calendar connection ── */}
          {stepId === 'calendar' && (
            <div className="space-y-5 text-center">
              {/* Icon — swaps to checkmark when connected */}
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl transition-all duration-500"
                style={{
                  background: gcalConnected ? 'rgba(34,197,94,0.12)' : 'rgba(96,165,250,0.1)',
                  border: gcalConnected ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                }}
              >
                {gcalConnected ? (
                  <span style={{ fontSize: '2rem', color: '#22C55E' }}>✓</span>
                ) : (
                  '📅'
                )}
              </div>

              <div>
                <h2 className="font-display font-bold text-xl text-text-primary">
                  {gcalConnected ? 'Calendar Connected' : 'Connect Google Calendar'}
                </h2>
                <p className="text-sm text-text-muted leading-relaxed max-w-xs mx-auto mt-1.5">
                  {gcalConnected
                    ? 'PatternOS will read your events and write your AI day plans directly to your calendar.'
                    : 'PatternOS reads your existing events to avoid conflicts and writes your AI-generated day plan directly to your calendar.'}
                </p>
              </div>

              {/* Connected confirmation banner */}
              {gcalConnected ? (
                <div
                  className="rounded-xl px-4 py-3 text-sm font-medium fade-in"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ADE80' }}
                >
                  ✓ Google Calendar authorized — your events are synced
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={openGcalAuth}
                    disabled={gcalChecking}
                    className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
                    style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#93C5FD' }}
                  >
                    {gcalChecking ? (
                      <>
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                          style={{ borderColor: '#93C5FD', borderTopColor: 'transparent' }}
                        />
                        Waiting for authorization…
                      </>
                    ) : (
                      <><span>📅</span> Connect Google Calendar</>
                    )}
                  </button>
                  {!gcalChecking && (
                    <p className="text-xs text-text-muted">Opens a small sign-in window</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={back} className="flex-1 py-3 rounded-xl text-sm text-text-muted border border-border hover:text-text-primary transition-colors">
                  Back
                </button>
                <button
                  onClick={next}
                  className="flex-1 py-3 rounded-xl font-display font-bold text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}
                >
                  {gcalConnected ? 'Continue →' : 'Skip for now →'}
                </button>
              </div>
            </div>
          )}

          {/* ── First goal ── */}
          {stepId === 'goal' && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <h2 className="font-display font-bold text-xl text-text-primary">Set your first goal</h2>
                <p className="text-sm text-text-muted mt-1.5">PatternOS builds your day plan around your goals. You can add more later.</p>
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-1.5">What's your #1 goal right now?</label>
                <input
                  type="text"
                  value={goal.title}
                  onChange={(e) => setGoal((p) => ({ ...p, title: e.target.value }))}
                  placeholder={mode === 'operator' ? 'e.g. Close $10K MRR by June' : 'e.g. Run 5K three times a week'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-2">Pillar</label>
                <div className="grid grid-cols-4 gap-2">
                  {DOMAINS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setGoal((p) => ({ ...p, domain: d.id }))}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl border text-xs transition-all"
                      style={{
                        borderColor: goal.domain === d.id ? d.color + '50' : '#252540',
                        background: goal.domain === d.id ? d.color + '10' : 'transparent',
                        color: goal.domain === d.id ? d.color : '#5A5A72',
                      }}
                    >
                      <span className="text-base">{d.icon}</span>
                      <span>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted block mb-1.5">Target (optional)</label>
                  <input
                    type="number"
                    value={goal.target_value || ''}
                    onChange={(e) => setGoal((p) => ({ ...p, target_value: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g. 10000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1.5">Unit</label>
                  <input
                    type="text"
                    value={goal.target_label}
                    onChange={(e) => setGoal((p) => ({ ...p, target_label: e.target.value }))}
                    placeholder="MRR, km, books..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={back} className="flex-1 py-3 rounded-xl text-sm text-text-muted border border-border hover:text-text-primary transition-colors">
                  Back
                </button>
                <button onClick={saveGoal} disabled={saving} className="flex-1 py-3 rounded-xl font-display font-bold text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}>
                  {saving ? '...' : goal.title.trim() ? 'Save & Continue →' : 'Skip →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Ready ── */}
          {stepId === 'ready' && (
            <div className="text-center space-y-5">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span style={{ color: '#8B0000', fontSize: '2.5rem' }}>✦</span>
              </div>
              <h2 className="font-display font-bold text-2xl text-text-primary">You're ready.</h2>
              <p className="text-sm text-text-muted leading-relaxed max-w-sm mx-auto">
                {mode === 'operator'
                  ? 'Operator Mode is active. Your day plans will prioritize revenue, product, and conviction — all balanced with physical and spiritual recovery.'
                  : 'PatternOS is configured for your personal growth. Your first daily check-in starts the intelligence loop.'}
              </p>

              <div className="rounded-xl p-4 border text-left space-y-2" style={{ borderColor: 'rgba(139,0,0,0.2)', background: 'rgba(139,0,0,0.05)' }}>
                <p className="text-xs font-semibold text-text-primary">Your first three actions:</p>
                {[
                  { n: 1, text: 'Do your morning check-in from the Dashboard', icon: '◉' },
                  { n: 2, text: 'Go to Calendar → Plan My Day', icon: '◷' },
                  { n: 3, text: 'Sync to Google Calendar and execute', icon: '✓' },
                ].map((a) => (
                  <div key={a.n} className="flex items-center gap-2.5 text-xs text-text-muted">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: 'rgba(139,0,0,0.15)', color: '#8B0000' }}>{a.n}</span>
                    {a.text}
                  </div>
                ))}
              </div>

              <button
                onClick={finish}
                disabled={saving}
                className="w-full py-3.5 rounded-xl font-display font-bold text-sm mt-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}
              >
                {saving ? '...' : 'Enter PatternOS →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
