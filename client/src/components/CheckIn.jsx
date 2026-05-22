import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { pillarColor, localDateStr } from '../utils/formatters.js';
import ActivityLogger from './ActivityLogger.jsx';

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
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display font-bold text-text-primary">Daily Check-In</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}{' '}
              · ~90 seconds
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-border transition-colors"
          >
            ×
          </button>
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
