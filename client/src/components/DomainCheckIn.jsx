import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from './Toast.jsx';
import { localDateStr } from '../utils/formatters.js';

const DOMAIN_FIELDS = {
  construction: [
    { name: 'sleep_hours', label: 'Sleep Hours', type: 'slider', min: 0, max: 12, step: 0.5 },
    { name: 'exercise', label: 'Exercise Today', type: 'toggle' },
    { name: 'energy_score', label: 'Energy', type: 'slider', min: 1, max: 10 },
    { name: 'nutrition_score', label: 'Nutrition', type: 'slider', min: 1, max: 10 },
  ],
  sojourney: [
    { name: 'mood_score', label: 'Mood', type: 'slider', min: 1, max: 10 },
    { name: 'stress_score', label: 'Stress', type: 'slider', min: 1, max: 10, description: '1 = calm, 10 = overwhelmed' },
  ],
  kaizen: [
    { name: 'focus_score', label: 'Focus Quality', type: 'slider', min: 1, max: 10 },
    { name: 'learning', label: 'Learned Something', type: 'toggle' },
  ],
  harmony: [
    { name: 'reflection_done', label: 'Did Reflection', type: 'toggle' },
    { name: 'purpose_score', label: 'Purpose', type: 'slider', min: 1, max: 10 },
    { name: 'gratitude_done', label: 'Practiced Gratitude', type: 'toggle' },
    { name: 'alignment_score', label: 'Alignment', type: 'slider', min: 1, max: 10 },
  ],
  '200': [
    { name: 'productive_hours', label: 'Productive Hours', type: 'slider', min: 0, max: 16, step: 0.5 },
    { name: 'milestone_hit', label: 'Hit a Milestone', type: 'toggle' },
    { name: 'revenue_note', label: 'Revenue Note', type: 'text' },
  ],
};

export default function DomainCheckIn({ domain, color, onSaved }) {
  const fields = DOMAIN_FIELDS[domain];
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => {
    const defaults = {};
    if (fields) {
      for (const f of fields) {
        if (f.type === 'toggle') defaults[f.name] = false;
        else if (f.type === 'slider') defaults[f.name] = f.min + Math.floor((f.max - f.min) / 2);
        else defaults[f.name] = '';
      }
    }
    return defaults;
  });
  const [saving, setSaving] = useState(false);

  if (!fields) return null;

  const set = (name, val) => setForm(prev => ({ ...prev, [name]: val }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await axios.post('/api/checkin', {
        ...form,
        date: localDateStr(),
      });
      toast.success('Quick check-in saved');
      setOpen(false);
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-lg border border-border text-sm font-display font-medium text-text-muted hover:text-text-primary hover:border-text-muted transition-all"
      >
        + Quick Check-In
      </button>
    );
  }

  return (
    <div className="card fade-in" style={{ borderColor: color + '30' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-sm text-text-primary">Quick Check-In</h3>
        <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary text-sm">×</button>
      </div>

      <div className="space-y-4">
        {fields.map(field => {
          if (field.type === 'slider') {
            const fillPct = ((form[field.name] - field.min) / (field.max - field.min)) * 100;
            return (
              <div key={field.name}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-text-muted uppercase tracking-wider">{field.label}</label>
                  <span className="text-sm font-mono font-bold" style={{ color: '#C9C9C9', minWidth: 32, textAlign: 'right' }}>
                    {form[field.name]}
                  </span>
                </div>
                {field.description && (
                  <p className="text-xs text-text-muted mb-2" style={{ fontSize: 10, letterSpacing: '0.05em' }}>{field.description}</p>
                )}
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step || 1}
                  value={form[field.name]}
                  onChange={e => set(field.name, parseFloat(e.target.value))}
                  className="w-full"
                  style={{ '--slider-fill': `${fillPct}%` }}
                />
                <div className="flex justify-between mt-1">
                  <span style={{ fontSize: 9, color: '#3A3A50', fontFamily: 'DM Mono, monospace' }}>{field.min}</span>
                  <span style={{ fontSize: 9, color: '#3A3A50', fontFamily: 'DM Mono, monospace' }}>{field.max}</span>
                </div>
              </div>
            );
          }
          if (field.type === 'toggle') {
            const on = form[field.name];
            return (
              <div key={field.name} className="flex items-center justify-between py-1">
                <span className="text-xs font-mono text-text-muted uppercase tracking-wider">{field.label}</span>
                <button
                  type="button"
                  onClick={() => set(field.name, !on)}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: on ? 'linear-gradient(135deg, #8B0000, #B22222)' : '#1E1E32',
                    border: `1px solid ${on ? '#B22222' : '#2E2E48'}`,
                    boxShadow: on ? '0 0 8px rgba(139,0,0,0.35)' : 'none',
                    position: 'relative', transition: 'all 0.2s ease', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3,
                    left: on ? 23 : 3,
                    width: 16, height: 16, borderRadius: '50%',
                    background: on ? '#fff' : '#4A4A68',
                    boxShadow: on ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
                    transition: 'all 0.2s ease',
                  }} />
                </button>
              </div>
            );
          }
          if (field.type === 'text') {
            return (
              <div key={field.name}>
                <label className="text-xs font-mono text-text-muted block mb-1">{field.label}</label>
                <input
                  type="text"
                  value={form[field.name]}
                  onChange={e => set(field.name, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm font-mono text-text-primary focus:outline-none"
                />
              </div>
            );
          }
          return null;
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full mt-4 py-2.5 rounded-lg font-display font-semibold text-sm transition-all"
        style={{ backgroundColor: color, color: '#0A0A0F', opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
