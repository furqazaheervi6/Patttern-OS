import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { pillarColor, localDateStr } from '../utils/formatters.js';
import ActivityLogger from './ActivityLogger.jsx';

// Mirror of server/utils/pillarScorer.js — kept in sync
function computeScores(f) {
  const physical = Math.round(
    Math.min(((f.sleep_hours || 0) / 8) * 25, 25) +
    (f.exercise ? 25 : 0) +
    ((f.energy_score || 0) / 10) * 25 +
    ((f.nutrition_score || 0) / 10) * 25
  );
  const mental = Math.round(
    ((f.focus_score || 0) / 10) * 30 +
    ((f.mood_score || 0) / 10) * 30 +
    ((10 - (f.stress_score || 5)) / 10) * 25 +
    (f.learning ? 15 : 0)
  );
  const financial = Math.round(
    Math.min(((f.productive_hours || 0) / 8) * 50, 50) +
    (f.milestone_hit ? 30 : 0) +
    (f.revenue_note && f.revenue_note !== '$0' && f.revenue_note.trim() ? 20 : 0)
  );
  const spiritual = Math.round(
    (f.reflection_done ? 25 : 0) +
    ((f.purpose_score || 0) / 10) * 30 +
    (f.gratitude_done ? 20 : 0) +
    ((f.alignment_score || 0) / 10) * 25
  );
  const overall = Math.round((physical + mental + financial + spiritual) / 4);
  return { physical, mental, financial, spiritual, overall };
}

const SCORE_COLORS = { physical: '#22C55E', mental: '#60A5FA', financial: '#FBBF24', spiritual: '#C084FC' };

function LiveScoreBar({ label, value, color }) {
  const [w, setW] = React.useState(0);
  React.useEffect(() => { const t = setTimeout(() => setW(value), 50); return () => clearTimeout(t); }, [value]);
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: '0.52rem', color: '#4A4A68', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace', width: '52px', textAlign: 'right', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '3px', background: 'rgba(37,37,64,0.8)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${w}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: '2px', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
      <span style={{ fontSize: '0.62rem', color, fontFamily: 'DM Mono, monospace', width: '26px', textAlign: 'right', flexShrink: 0 }}>{value}</span>
    </div>
  );
}

const DEFAULT = {
  sleep_hours: 7,
  exercise: false,
  energy_score: 7,
  nutrition_score: 7,
  focus_score: 7,
  mood_score: 7,
  stress_score: 4,
  learning: false,
  productive_hours: 6,
  milestone_hit: false,
  revenue_note: '',
  runway_note: '',
  reflection_done: false,
  purpose_score: 7,
  gratitude_done: false,
  alignment_score: 7,
};

function SliderRow({ label, name, value, onChange, min = 1, max = 10, description }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-mono text-text-muted">{label}</label>
        <span className="text-xs font-mono font-semibold text-text-primary">{value}</span>
      </div>
      {description && (
        <p className="text-xs text-text-muted mb-1" style={{ fontSize: '10px' }}>
          {description}
        </p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(name, parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function ToggleRow({ label, name, value, onChange, description }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-mono text-text-muted">{label}</p>
        {description && (
          <p className="text-xs text-text-muted" style={{ fontSize: '10px' }}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(name, !value)}
        className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${
          value ? 'bg-physical' : 'bg-border'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function Section({ pillar, title, icon, children }) {
  const color = pillarColor(pillar);
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ borderColor: color + '30', background: color + '05' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">{icon}</span>
        <h3 className="font-display font-semibold text-sm" style={{ color }}>
          {title}
        </h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function CheckIn({ existing, onClose, onSaved }) {
  const [form, setForm] = useState(existing ? { ...DEFAULT, ...existing } : { ...DEFAULT });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const set = (name, val) => setForm((prev) => ({ ...prev, [name]: val }));
  const scores = useMemo(() => computeScores(form), [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post('/api/checkin', {
        ...form,
        date: localDateStr(),
      });
      setToast('✓ Check-in saved!');
      setTimeout(() => {
        onSaved?.(res.data);
        onClose?.();
      }, 800);
    } catch (err) {
      setToast('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,10,15,0.95)' }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl slide-up"
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display font-bold text-text-primary">Daily Check-In</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {' '}· ~90 seconds
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.5rem', color: '#4A4A68', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '1px' }}>Overall</p>
                <span style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: scores.overall >= 70 ? '#22C55E' : scores.overall >= 45 ? '#FBBF24' : '#F87171', lineHeight: 1 }}>
                  {scores.overall}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-primary text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-border transition-colors"
              >
                ×
              </button>
            </div>
          </div>
          {/* Live pillar score bars */}
          <div className="space-y-1.5">
            {[
              { key: 'physical', label: 'Phys' },
              { key: 'mental', label: 'Mind' },
              { key: 'financial', label: 'Work' },
              { key: 'spiritual', label: 'Soul' },
            ].map(({ key, label }) => (
              <LiveScoreBar key={key} label={label} value={scores[key]} color={SCORE_COLORS[key]} />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Physical */}
          <Section pillar="physical" title="Physical — Body" icon="🏋️">
            <SliderRow
              label="Sleep hours"
              name="sleep_hours"
              value={form.sleep_hours}
              onChange={set}
              min={0}
              max={12}
              description="Hours slept last night"
            />
            <ToggleRow label="Exercise today" name="exercise" value={form.exercise} onChange={set} />
            <SliderRow
              label="Energy level"
              name="energy_score"
              value={form.energy_score}
              onChange={set}
            />
            <SliderRow
              label="Nutrition quality"
              name="nutrition_score"
              value={form.nutrition_score}
              onChange={set}
            />
          </Section>

          {/* Mental */}
          <Section pillar="mental" title="Mental — Mind" icon="🧠">
            <SliderRow
              label="Focus quality"
              name="focus_score"
              value={form.focus_score}
              onChange={set}
            />
            <SliderRow label="Mood" name="mood_score" value={form.mood_score} onChange={set} />
            <SliderRow
              label="Stress level"
              name="stress_score"
              value={form.stress_score}
              onChange={set}
              description="1 = calm, 10 = overwhelmed"
            />
            <ToggleRow
              label="Learned something new"
              name="learning"
              value={form.learning}
              onChange={set}
            />
          </Section>

          {/* Financial */}
          <Section pillar="financial" title="Financial — World" icon="💰">
            <SliderRow
              label="Productive hours"
              name="productive_hours"
              value={form.productive_hours}
              onChange={set}
              min={0}
              max={16}
              description="Deep work / meaningful output"
            />
            <ToggleRow
              label="Hit a milestone"
              name="milestone_hit"
              value={form.milestone_hit}
              onChange={set}
            />
            <div>
              <label className="text-xs font-mono text-text-muted block mb-1">Revenue note</label>
              <input
                type="text"
                value={form.revenue_note}
                onChange={(e) => set('revenue_note', e.target.value)}
                placeholder="$0 / first paid user / etc."
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-financial transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-text-muted block mb-1">Runway note</label>
              <input
                type="text"
                value={form.runway_note}
                onChange={(e) => set('runway_note', e.target.value)}
                placeholder="e.g. 6 months"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-financial transition-colors"
              />
            </div>
          </Section>

          {/* Spiritual */}
          <Section pillar="spiritual" title="Spiritual — Soul" icon="🕊️">
            <ToggleRow
              label="Did reflection / journaling"
              name="reflection_done"
              value={form.reflection_done}
              onChange={set}
            />
            <SliderRow
              label="Sense of purpose"
              name="purpose_score"
              value={form.purpose_score}
              onChange={set}
            />
            <ToggleRow
              label="Practiced gratitude"
              name="gratitude_done"
              value={form.gratitude_done}
              onChange={set}
            />
            <SliderRow
              label="Alignment with values"
              name="alignment_score"
              value={form.alignment_score}
              onChange={set}
              description="Are you living true to yourself?"
            />
          </Section>

          {/* Activities */}
          <div className="rounded-xl p-4 border border-border bg-surface/50">
            <ActivityLogger compact date={localDateStr()} />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all"
              style={{
                background: 'linear-gradient(135deg, #60A5FA, #C084FC)',
                color: '#0A0A0F',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '⟳ Saving...' : '✓ Save Check-In'}
            </button>
          </div>
        </form>

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-surface border border-border text-sm font-mono text-text-primary shadow-xl fade-in">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
