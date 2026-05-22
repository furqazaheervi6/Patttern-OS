// Pearson correlation — extracted from analytics.js for isolated testing
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

describe('pearson correlation', () => {
  it('returns 1 for perfectly correlated data', () => {
    expect(pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(1.0, 5);
  });

  it('returns -1 for perfectly inversely correlated data', () => {
    expect(pearson([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])).toBeCloseTo(-1.0, 5);
  });

  it('returns ~0 for uncorrelated data', () => {
    const r = pearson([1, 2, 3, 4, 5], [3, 1, 4, 1, 5]);
    expect(Math.abs(r)).toBeLessThan(0.5);
  });

  it('returns 0 for fewer than 3 data points', () => {
    expect(pearson([1, 2], [3, 4])).toBe(0);
    expect(pearson([1], [2])).toBe(0);
    expect(pearson([], [])).toBe(0);
  });

  it('returns 0 for constant arrays (zero variance)', () => {
    expect(pearson([5, 5, 5, 5], [1, 2, 3, 4])).toBe(0);
    expect(pearson([1, 2, 3, 4], [5, 5, 5, 5])).toBe(0);
  });

  it('returns 1 for identical arrays', () => {
    const xs = [1, 2, 3, 4, 5];
    expect(pearson(xs, xs)).toBeCloseTo(1.0, 5);
  });

  it('handles negative numbers', () => {
    expect(pearson([-5, -3, -1, 1, 3, 5], [-10, -6, -2, 2, 6, 10])).toBeCloseTo(1.0, 5);
  });

  it('handles same-length arrays (the normal usage path)', () => {
    // In production, both arrays come from the same filtered rows, so same length
    expect(pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(1.0, 5);
  });

  it('handles realistic sleep vs focus data', () => {
    const sleep = [6, 7, 5, 8, 6, 7, 8, 5, 9, 7];
    const focus = [5, 7, 4, 8, 5, 6, 9, 3, 9, 7];
    const r = pearson(sleep, focus);
    expect(r).toBeGreaterThan(0.5);
    expect(r).toBeLessThanOrEqual(1.0);
  });
});

describe('streak calculation logic', () => {
  function calculateStreaks(rows, field) {
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i > 0) {
        const d1 = new Date(rows[i - 1].date);
        const d2 = new Date(row.date);
        const gap = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
        if (gap > 1) break;
      }
      if (field === 'checkin' || !!row[field]) count++;
      else break;
    }
    return count;
  }

  it('counts consecutive check-in days', () => {
    const rows = [
      { date: '2025-01-05', exercise: true },
      { date: '2025-01-04', exercise: true },
      { date: '2025-01-03', exercise: true },
    ];
    expect(calculateStreaks(rows, 'checkin')).toBe(3);
  });

  it('breaks on date gap', () => {
    const rows = [
      { date: '2025-01-05', exercise: true },
      { date: '2025-01-03', exercise: true },
      { date: '2025-01-02', exercise: true },
    ];
    expect(calculateStreaks(rows, 'checkin')).toBe(1);
  });

  it('breaks when field is false', () => {
    const rows = [
      { date: '2025-01-05', exercise: true },
      { date: '2025-01-04', exercise: false },
      { date: '2025-01-03', exercise: true },
    ];
    expect(calculateStreaks(rows, 'exercise')).toBe(1);
  });

  it('returns 0 for empty rows', () => {
    expect(calculateStreaks([], 'exercise')).toBe(0);
  });

  it('returns 1 for single day', () => {
    expect(calculateStreaks([{ date: '2025-01-05', exercise: true }], 'exercise')).toBe(1);
  });

  it('returns 0 when first day field is false', () => {
    const rows = [
      { date: '2025-01-05', exercise: false },
      { date: '2025-01-04', exercise: true },
    ];
    expect(calculateStreaks(rows, 'exercise')).toBe(0);
  });
});

describe('CSV export formatting', () => {
  function formatCsvRow(headers, row) {
    return headers.map(h => {
      const val = row[h];
      if (val == null) return '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  }

  it('formats simple values', () => {
    expect(formatCsvRow(['a', 'b', 'c'], { a: 1, b: 'hello', c: 3 })).toBe('1,hello,3');
  });

  it('handles null values as empty strings', () => {
    expect(formatCsvRow(['a', 'b'], { a: null, b: 'ok' })).toBe(',ok');
  });

  it('wraps strings with commas in quotes', () => {
    expect(formatCsvRow(['a'], { a: 'hello, world' })).toBe('"hello, world"');
  });

  it('escapes double quotes by doubling them', () => {
    expect(formatCsvRow(['a'], { a: 'he said "hi"' })).toBe('"he said ""hi"""');
  });

  it('handles numeric values without quoting', () => {
    expect(formatCsvRow(['a', 'b'], { a: 42, b: 3.14 })).toBe('42,3.14');
  });
});
