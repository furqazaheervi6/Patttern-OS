const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// GET /api/analytics/streaks
router.get('/streaks', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM checkins ORDER BY date DESC');

    const streaks = {
      exercise: { current: 0, best: 0 },
      meditation: { current: 0, best: 0 },
      learning: { current: 0, best: 0 },
      gratitude: { current: 0, best: 0 },
      checkin: { current: 0, best: 0 },
      sleep7plus: { current: 0, best: 0 },
    };

    // Calculate best streaks from all data
    for (const key of Object.keys(streaks)) {
      let current = 0;
      for (const row of rows) {
        const active = key === 'checkin' ? true
          : key === 'exercise' ? !!row.exercise
          : key === 'meditation' ? !!row.reflection_done
          : key === 'learning' ? !!row.learning
          : key === 'gratitude' ? !!row.gratitude_done
          : key === 'sleep7plus' ? (row.sleep_hours || 0) >= 7
          : false;
        if (active) {
          current++;
          streaks[key].best = Math.max(streaks[key].best, current);
        } else {
          current = 0;
        }
      }
    }

    // Recalculate current streaks properly (consecutive from today)
    for (const key of Object.keys(streaks)) {
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Check date continuity
        if (i > 0) {
          const d1 = new Date(rows[i - 1].date);
          const d2 = new Date(row.date);
          const gap = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
          if (gap > 1) break;
        }
        const active = key === 'checkin' ? true
          : key === 'exercise' ? !!row.exercise
          : key === 'meditation' ? !!row.reflection_done
          : key === 'learning' ? !!row.learning
          : key === 'gratitude' ? !!row.gratitude_done
          : key === 'sleep7plus' ? (row.sleep_hours || 0) >= 7
          : false;
        if (active) count++;
        else break;
      }
      streaks[key].current = count;
    }

    res.json(streaks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/correlations
router.get('/correlations', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM checkins ORDER BY date ASC');
    if (rows.length < 5) {
      return res.json({ correlations: [], insufficient: true });
    }

    // Cast all numeric/boolean fields coming from sql.unsafe() (which returns strings)
    const numFields = ['sleep_hours','mood_score','energy_score','focus_score','stress_score',
      'productive_hours','physical_score','mental_score','financial_score','spiritual_score',
      'overall_score','water_intake','steps'];
    const boolFields = ['exercise','reflection_done','learning','gratitude_done'];
    const parsed = rows.map(r => {
      const out = { ...r };
      for (const f of numFields) {
        if (out[f] != null) out[f] = parseFloat(out[f]) || 0;
      }
      for (const f of boolFields) {
        if (out[f] != null) out[f] = out[f] === true || out[f] === 't' || out[f] === '1' || out[f] === 1 ? 1 : 0;
      }
      return out;
    });

    const pairs = [
      { a: 'sleep_hours', b: 'focus_score', labelA: 'Sleep', labelB: 'Focus' },
      { a: 'sleep_hours', b: 'mood_score', labelA: 'Sleep', labelB: 'Mood' },
      { a: 'sleep_hours', b: 'energy_score', labelA: 'Sleep', labelB: 'Energy' },
      { a: 'exercise', b: 'mood_score', labelA: 'Exercise', labelB: 'Mood' },
      { a: 'exercise', b: 'energy_score', labelA: 'Exercise', labelB: 'Energy' },
      { a: 'exercise', b: 'focus_score', labelA: 'Exercise', labelB: 'Focus' },
      { a: 'stress_score', b: 'focus_score', labelA: 'Stress', labelB: 'Focus', invert: true },
      { a: 'stress_score', b: 'sleep_hours', labelA: 'Stress', labelB: 'Sleep', invert: true },
      { a: 'reflection_done', b: 'purpose_score', labelA: 'Reflection', labelB: 'Purpose' },
      { a: 'reflection_done', b: 'mood_score', labelA: 'Reflection', labelB: 'Mood' },
      { a: 'productive_hours', b: 'purpose_score', labelA: 'Productive Hours', labelB: 'Purpose' },
      { a: 'physical_score', b: 'mental_score', labelA: 'Physical', labelB: 'Mental' },
      { a: 'physical_score', b: 'financial_score', labelA: 'Physical', labelB: 'Financial' },
      { a: 'spiritual_score', b: 'mental_score', labelA: 'Spiritual', labelB: 'Mental' },
    ];

    const correlations = [];
    for (const pair of pairs) {
      const aVals = parsed.map(r => r[pair.a]).filter(v => v != null);
      const bVals = parsed.map(r => r[pair.b]).filter(v => v != null);
      if (aVals.length < 5 || bVals.length < 5) continue;

      // For boolean fields, compare average of B when A=true vs A=false
      const aIsBool = aVals.every(v => v === 0 || v === 1);
      if (aIsBool) {
        const withA = parsed.filter(r => r[pair.a] === 1).map(r => r[pair.b]).filter(v => v != null);
        const withoutA = parsed.filter(r => r[pair.a] === 0).map(r => r[pair.b]).filter(v => v != null);
        if (withA.length < 2 || withoutA.length < 2) continue;
        const avgWith = withA.reduce((s, v) => s + v, 0) / withA.length;
        const avgWithout = withoutA.reduce((s, v) => s + v, 0) / withoutA.length;
        const diff = avgWith - avgWithout;
        const pctDiff = avgWithout > 0 ? Math.round((diff / avgWithout) * 100) : 0;
        if (Math.abs(pctDiff) >= 5) {
          correlations.push({
            ...pair,
            type: 'boolean',
            avgWith: Math.round(avgWith * 10) / 10,
            avgWithout: Math.round(avgWithout * 10) / 10,
            diff: Math.round(diff * 10) / 10,
            pctDiff,
            insight: `When ${pair.labelA} is active, ${pair.labelB} is ${Math.abs(pctDiff)}% ${diff > 0 ? 'higher' : 'lower'}`,
            strength: Math.abs(pctDiff) >= 20 ? 'strong' : 'moderate',
          });
        }
      } else {
        // Pearson correlation for numeric pairs
        const validRows = parsed.filter(r => r[pair.a] != null && r[pair.b] != null);
        if (validRows.length < 5) continue;
        const xs = validRows.map(r => r[pair.a]);
        const ys = validRows.map(r => r[pair.b]);
        const r = pearson(xs, ys);
        if (Math.abs(r) >= 0.2) {
          const median = xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
          const above = validRows.filter(row => row[pair.a] > median).map(row => row[pair.b]);
          const below = validRows.filter(row => row[pair.a] <= median).map(row => row[pair.b]);
          const avgAbove = above.length ? above.reduce((s, v) => s + v, 0) / above.length : 0;
          const avgBelow = below.length ? below.reduce((s, v) => s + v, 0) / below.length : 0;
          const diff = avgAbove - avgBelow;
          const pctDiff = avgBelow > 0 ? Math.round((diff / avgBelow) * 100) : 0;

          const direction = pair.invert ? (r < 0 ? 'positive' : 'negative') : (r > 0 ? 'positive' : 'negative');
          correlations.push({
            ...pair,
            type: 'numeric',
            correlation: Math.round(r * 100) / 100,
            avgAboveMedian: Math.round(avgAbove * 10) / 10,
            avgBelowMedian: Math.round(avgBelow * 10) / 10,
            pctDiff,
            insight: `When ${pair.labelA} > ${Math.round(median * 10) / 10}, ${pair.labelB} is ${Math.abs(pctDiff)}% ${diff > 0 ? 'higher' : 'lower'}`,
            strength: Math.abs(r) >= 0.5 ? 'strong' : 'moderate',
            direction,
          });
        }
      }
    }

    // Sort by strength
    correlations.sort((a, b) => {
      const sa = a.type === 'boolean' ? Math.abs(a.pctDiff) : Math.abs(a.correlation * 100);
      const sb = b.type === 'boolean' ? Math.abs(b.pctDiff) : Math.abs(b.correlation * 100);
      return sb - sa;
    });

    res.json({ correlations: correlations.slice(0, 10), total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

// GET /api/analytics/comparison?period=week|month
router.get('/comparison', async (req, res) => {
  try {
    const period = req.query.period || 'week';
    const daysBack = period === 'month' ? 30 : 7;

    const current = await query(
      `SELECT * FROM checkins WHERE date > (CURRENT_DATE - ${daysBack})::text ORDER BY date ASC`
    );
    const previous = await query(
      `SELECT * FROM checkins WHERE date <= (CURRENT_DATE - ${daysBack})::text AND date > (CURRENT_DATE - ${daysBack * 2})::text ORDER BY date ASC`
    );

    const avg = (arr, key) => {
      const vals = arr.map(d => parseFloat(d[key])).filter(v => !isNaN(v));
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };

    const pillars = ['physical_score', 'mental_score', 'financial_score', 'spiritual_score', 'overall_score'];
    const currentAvg = {};
    const previousAvg = {};
    const delta = {};

    for (const p of pillars) {
      currentAvg[p] = avg(current, p);
      previousAvg[p] = avg(previous, p);
      delta[p] = currentAvg[p] != null && previousAvg[p] != null ? currentAvg[p] - previousAvg[p] : null;
    }

    res.json({
      period,
      current: { avg: currentAvg, days: current.length },
      previous: { avg: previousAvg, days: previous.length },
      delta,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/export?format=csv|json
router.get('/export', async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const rows = await query('SELECT * FROM checkins ORDER BY date ASC');

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename=patternos-export.json');
      res.setHeader('Content-Type', 'application/json');
      return res.json(rows);
    }

    // CSV
    if (rows.length === 0) return res.status(404).json({ error: 'No data to export' });
    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      csvRows.push(headers.map(h => {
        const val = row[h];
        if (val == null) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(','));
    }
    res.setHeader('Content-Disposition', 'attachment; filename=patternos-export.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvRows.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
