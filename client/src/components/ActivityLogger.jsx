import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { localDateStr } from '../utils/formatters.js';

const DOMAIN_COLORS = {
  physical: '#22C55E',
  mental: '#60A5FA',
  financial: '#FBBF24',
  spiritual: '#C084FC',
};

const DOMAIN_LABELS = {
  physical: 'Physical',
  mental: 'Mental',
  financial: 'Financial',
  spiritual: 'Spiritual',
};

export default function ActivityLogger({ date, compact = false, onChanged }) {
  const [activities, setActivities] = useState([]);
  const [logged, setLogged] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDomain, setFilterDomain] = useState(null);

  const today = date || localDateStr();

  useEffect(() => {
    const fetch = async () => {
      try {
        const [actRes, logRes] = await Promise.all([
          axios.get('/api/activities'),
          axios.get(`/api/activities/log?date=${today}`),
        ]);
        setActivities(actRes.data);
        setLogged(logRes.data);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, [today]);

  const loggedIds = useMemo(() => new Set(logged.map((l) => l.activity_id)), [logged]);

  const toggleActivity = async (activityId) => {
    if (loggedIds.has(activityId)) {
      // Remove it
      const entry = logged.find((l) => l.activity_id === activityId);
      if (entry) {
        await axios.delete(`/api/activities/log/${entry.id}`);
        setLogged((prev) => prev.filter((l) => l.id !== entry.id));
      }
    } else {
      // Log it
      const res = await axios.post('/api/activities/log', {
        activity_id: activityId,
        date: today,
      });
      // Refresh log to get full joined data
      const logRes = await axios.get(`/api/activities/log?date=${today}`);
      setLogged(logRes.data);
    }
    onChanged?.();
  };

  // Compute impact preview
  const impactPreview = useMemo(() => {
    const mods = { physical: 0, mental: 0, financial: 0, spiritual: 0 };
    for (const entry of logged) {
      const sign = entry.impact === 'negative' ? -1 : 1;
      mods[entry.domain] += sign * (entry.weight || 3) * 3;
    }
    // Clamp
    for (const k of Object.keys(mods)) {
      mods[k] = Math.max(-30, Math.min(30, mods[k]));
    }
    return mods;
  }, [logged]);

  const domains = ['physical', 'mental', 'financial', 'spiritual'];
  const filtered = filterDomain
    ? activities.filter((a) => a.domain === filterDomain)
    : activities;

  if (loading) {
    return (
      <div className="card animate-pulse h-24 flex items-center justify-center text-text-muted text-xs">
        Loading activities...
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="card text-center py-6">
        <p className="text-xs text-text-muted">
          No activities defined yet. Go to Settings → Activities to add your first ones.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'card'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-sm text-text-primary">
          Activity Log
        </h3>
        <span className="text-xs font-mono text-text-muted">
          {logged.length} logged
        </span>
      </div>

      {/* Impact Preview */}
      {logged.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {domains.map((d) => {
            const val = impactPreview[d];
            if (val === 0) return null;
            return (
              <span
                key={d}
                className="text-xs font-mono px-2 py-1 rounded-md border"
                style={{
                  color: val > 0 ? '#22C55E' : '#F87171',
                  borderColor: val > 0 ? '#22C55E30' : '#F8717130',
                  background: val > 0 ? '#22C55E08' : '#F8717108',
                }}
              >
                {DOMAIN_LABELS[d]}: {val > 0 ? '+' : ''}{val}
              </span>
            );
          })}
        </div>
      )}

      {/* Domain filter pills */}
      <div className="flex gap-1 mb-3 flex-wrap">
        <button
          onClick={() => setFilterDomain(null)}
          className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
            !filterDomain ? 'bg-border text-text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          All
        </button>
        {domains.map((d) => (
          <button
            key={d}
            onClick={() => setFilterDomain(d === filterDomain ? null : d)}
            className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
              filterDomain === d ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
            style={
              filterDomain === d
                ? { background: DOMAIN_COLORS[d] + '15', color: DOMAIN_COLORS[d], border: `1px solid ${DOMAIN_COLORS[d]}40` }
                : {}
            }
          >
            {DOMAIN_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Activity grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {filtered.map((act) => {
          const isLogged = loggedIds.has(act.id);
          const color = DOMAIN_COLORS[act.domain] || '#6B7280';
          const sign = act.impact === 'positive' ? '+' : '-';
          const points = act.weight * 3;

          return (
            <button
              key={act.id}
              onClick={() => toggleActivity(act.id)}
              className={`text-left px-3 py-2.5 rounded-lg border transition-all duration-150 ${
                isLogged
                  ? 'border-opacity-60'
                  : 'border-border hover:border-text-muted bg-surface/30'
              }`}
              style={
                isLogged
                  ? {
                      borderColor: act.impact === 'positive' ? '#22C55E60' : '#F8717160',
                      background: act.impact === 'positive' ? '#22C55E10' : '#F8717110',
                    }
                  : {}
              }
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{act.icon || '◎'}</span>
                <span className="text-xs font-display font-medium text-text-primary truncate flex-1">
                  {act.name}
                </span>
                {isLogged && (
                  <span className="text-xs" style={{ color: act.impact === 'positive' ? '#22C55E' : '#F87171' }}>
                    ✓
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs font-mono"
                  style={{ color: act.impact === 'positive' ? '#22C55E' : '#F87171', fontSize: '10px' }}
                >
                  {sign}{points}pts
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: color + '60' }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
