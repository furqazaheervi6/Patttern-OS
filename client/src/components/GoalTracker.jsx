import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './Toast.jsx';

export default function GoalTracker({ domain, color, currentData }) {
  const [goals, setGoals] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ metric: '', target_value: '', target_label: '' });
  const toast = useToast();

  const fetchGoals = () => {
    axios.get(`/api/goals?domain=${domain}`)
      .then(r => setGoals(r.data))
      .catch(() => {});
  };

  useEffect(fetchGoals, [domain]);

  const handleAdd = async () => {
    if (!form.metric || !form.target_value) return;
    try {
      await axios.post('/api/goals', {
        domain,
        metric: form.metric,
        target_value: parseFloat(form.target_value),
        target_label: form.target_label || null,
      });
      toast.success('Goal added');
      setForm({ metric: '', target_value: '', target_label: '' });
      setAdding(false);
      fetchGoals();
    } catch (err) {
      toast.error('Failed to add goal');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/goals/${id}`);
      toast.info('Goal removed');
      fetchGoals();
    } catch {
      toast.error('Failed to remove goal');
    }
  };

  const getProgress = (goal) => {
    if (!currentData) return null;
    const val = currentData[goal.metric];
    if (val == null) return null;
    const numVal = typeof val === 'boolean' ? (val ? 1 : 0) : val;
    return Math.min(Math.round((numVal / goal.target_value) * 100), 100);
  };

  const METRIC_OPTIONS = {
    construction: [
      { value: 'sleep_hours', label: 'Sleep Hours' },
      { value: 'energy_score', label: 'Energy Score' },
      { value: 'nutrition_score', label: 'Nutrition Score' },
    ],
    sojourney: [
      { value: 'mood_score', label: 'Mood Score' },
      { value: 'stress_score', label: 'Stress Level (lower is better)' },
    ],
    kaizen: [
      { value: 'focus_score', label: 'Focus Score' },
    ],
    harmony: [
      { value: 'purpose_score', label: 'Purpose Score' },
      { value: 'alignment_score', label: 'Alignment Score' },
    ],
    omnivision: [
      { value: 'overall_score', label: 'Overall Score' },
    ],
    '200': [
      { value: 'productive_hours', label: 'Productive Hours' },
    ],
    humanity: [
      { value: 'overall_score', label: 'Overall Score' },
    ],
  };

  const options = METRIC_OPTIONS[domain] || [];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-sm text-text-primary">Goals</h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-mono px-2 py-1 rounded border border-border hover:border-text-muted text-text-muted hover:text-text-primary transition-colors"
          >
            + Add Goal
          </button>
        )}
      </div>

      {/* Existing goals */}
      {goals.length === 0 && !adding && (
        <p className="text-xs text-text-muted font-mono">No goals set. Add one to start tracking.</p>
      )}

      <div className="space-y-3">
        {goals.map(goal => {
          const progress = getProgress(goal);
          return (
            <div key={goal.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-bg/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-text-muted">
                    {goal.target_label || goal.metric.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-mono" style={{ color }}>
                    {progress != null ? `${progress}%` : '—'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress || 0}%`,
                      backgroundColor: progress >= 100 ? '#22C55E' : color,
                    }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1 font-mono">
                  Target: {goal.target_value}
                  {progress >= 100 && ' ✓'}
                </p>
              </div>
              <button
                onClick={() => handleDelete(goal.id)}
                className="text-text-muted hover:text-red-400 text-xs transition-colors"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Add form */}
      {adding && (
        <div className="mt-3 p-3 rounded-lg border border-border bg-bg/50 space-y-2 fade-in">
          <select
            value={form.metric}
            onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm font-mono text-text-primary focus:outline-none"
          >
            <option value="">Select metric...</option>
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.5"
            placeholder="Target value"
            value={form.target_value}
            onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm font-mono text-text-primary focus:outline-none"
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={form.target_label}
            onChange={e => setForm(f => ({ ...f, target_label: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm font-mono text-text-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-xs flex-1">Save</button>
            <button onClick={() => setAdding(false)} className="btn-ghost text-xs flex-1">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
