import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const NUMERIC_FIELDS = [
  'physical_score', 'mental_score', 'financial_score', 'spiritual_score', 'overall_score',
  'sleep_hours', 'mood_score', 'energy_score', 'focus_score', 'stress_score', 'productive_hours',
  'water_intake', 'steps',
];
const BOOL_FIELDS = ['exercise', 'reflection_done', 'learning', 'gratitude_done'];

function parseRow(row) {
  if (!row) return null;
  const out = { ...row };
  for (const f of NUMERIC_FIELDS) {
    if (out[f] != null) out[f] = parseFloat(out[f]) || 0;
  }
  for (const f of BOOL_FIELDS) {
    if (out[f] != null) out[f] = out[f] === true || out[f] === 't' || out[f] === '1' || out[f] === 1;
  }
  return out;
}

export function usePillarData(days = 30) {
  const [history, setHistory] = useState([]);
  const [today, setToday] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [histRes, todayRes, alertRes] = await Promise.all([
        axios.get(`/api/checkin/history?days=${days}`),
        axios.get('/api/checkin/today'),
        axios.get('/api/checkin/alerts'),
      ]);
      setHistory((Array.isArray(histRes.data) ? histRes.data : []).map(parseRow));
      setToday(parseRow(todayRes.data));
      setAlerts(Array.isArray(alertRes.data) ? alertRes.data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 2 minutes to pick up Notion-synced check-ins
    const interval = setInterval(fetchAll, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const dismissAlert = async (id) => {
    try {
      await axios.post(`/api/checkin/alerts/${id}/dismiss`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  };

  return { history, today, alerts, loading, error, refetch: fetchAll, dismissAlert };
}

export function useWeekComparison(history) {
  if (!history || history.length === 0) {
    return { thisWeek: null, lastWeek: null };
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);

  const thisWeekData = history.filter((d) => new Date(d.date) >= weekStart);
  const lastWeekData = history.filter(
    (d) => new Date(d.date) >= lastWeekStart && new Date(d.date) < weekStart
  );

  const avg = (arr, key) => {
    const vals = arr.map((d) => d[key]).filter((v) => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };

  const pillars = ['physical_score', 'mental_score', 'financial_score', 'spiritual_score'];

  const thisWeek = {};
  const lastWeek = {};
  for (const p of pillars) {
    thisWeek[p] = avg(thisWeekData, p);
    lastWeek[p] = avg(lastWeekData, p);
  }

  return { thisWeek, lastWeek };
}
