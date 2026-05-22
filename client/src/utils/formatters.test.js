import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatFullDate,
  formatRelativeTime,
  localDateStr,
  pillarName,
  pillarIcon,
  pillarColor,
} from './formatters.js';

describe('formatDate', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('formats a valid date as "MMM d"', () => {
    const result = formatDate('2025-03-15');
    expect(result).toBe('Mar 15');
  });

  it('returns "Today" for today\'s date', () => {
    const today = localDateStr();
    expect(formatDate(today)).toBe('Today');
  });

  it('returns "Yesterday" for yesterday\'s date', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = localDateStr(d);
    expect(formatDate(yesterday)).toBe('Yesterday');
  });

  it('returns the original string for unparseable input', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatFullDate', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatFullDate(null)).toBe('');
    expect(formatFullDate(undefined)).toBe('');
  });

  it('formats a date as full day string', () => {
    const result = formatFullDate('2025-03-15');
    expect(result).toContain('March');
    expect(result).toContain('15');
    expect(result).toContain('2025');
    expect(result).toContain('Saturday');
  });

  it('returns original string for unparseable input', () => {
    expect(formatFullDate('bad')).toBe('bad');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Never" for null/undefined', () => {
    expect(formatRelativeTime(null)).toBe('Never');
    expect(formatRelativeTime(undefined)).toBe('Never');
  });

  it('returns "Just now" for < 60 seconds ago', () => {
    expect(formatRelativeTime('2025-06-15T11:59:30Z')).toBe('Just now');
  });

  it('returns minutes ago for < 1 hour', () => {
    expect(formatRelativeTime('2025-06-15T11:30:00Z')).toBe('30m ago');
  });

  it('returns hours ago for < 1 day', () => {
    expect(formatRelativeTime('2025-06-15T09:00:00Z')).toBe('3h ago');
  });

  it('returns days ago for > 1 day', () => {
    expect(formatRelativeTime('2025-06-13T12:00:00Z')).toBe('2d ago');
  });
});

describe('localDateStr', () => {
  it('returns YYYY-MM-DD for a given date', () => {
    const d = new Date(2025, 2, 5); // March 5, 2025 (month is 0-indexed)
    expect(localDateStr(d)).toBe('2025-03-05');
  });

  it('zero-pads single-digit months and days', () => {
    const d = new Date(2025, 0, 9); // Jan 9
    expect(localDateStr(d)).toBe('2025-01-09');
  });

  it('handles December 31', () => {
    const d = new Date(2025, 11, 31);
    expect(localDateStr(d)).toBe('2025-12-31');
  });

  it('defaults to today when no argument given', () => {
    const result = localDateStr();
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });

  it('uses local timezone, not UTC', () => {
    // 11:30 PM UTC on Jan 1 is still Jan 1 local in UTC+ timezones
    // but the key point is localDateStr uses getDate() not getUTCDate()
    const d = new Date(2025, 0, 15, 23, 59, 59); // local 11:59 PM Jan 15
    expect(localDateStr(d)).toBe('2025-01-15');
  });
});

describe('pillarName', () => {
  it('returns capitalized name for known pillars', () => {
    expect(pillarName('physical')).toBe('Physical');
    expect(pillarName('mental')).toBe('Mental');
    expect(pillarName('financial')).toBe('Financial');
    expect(pillarName('spiritual')).toBe('Spiritual');
    expect(pillarName('social')).toBe('Social');
    expect(pillarName('purpose')).toBe('Purpose');
    expect(pillarName('awareness')).toBe('Awareness');
  });

  it('returns the key itself for unknown pillars', () => {
    expect(pillarName('unknown')).toBe('unknown');
  });
});

describe('pillarIcon', () => {
  it('returns correct icons for known pillars', () => {
    expect(pillarIcon('physical')).toBeTruthy();
    expect(pillarIcon('mental')).toBeTruthy();
    expect(pillarIcon('financial')).toBeTruthy();
    expect(pillarIcon('spiritual')).toBeTruthy();
    expect(pillarIcon('social')).toBeTruthy();
    expect(pillarIcon('purpose')).toBeTruthy();
    expect(pillarIcon('awareness')).toBeTruthy();
  });

  it('returns fallback for unknown pillars', () => {
    expect(pillarIcon('unknown')).toBe('◎');
  });
});

describe('pillarColor', () => {
  it('returns correct colors for known pillars', () => {
    expect(pillarColor('physical')).toBe('#22C55E');
    expect(pillarColor('mental')).toBe('#60A5FA');
    expect(pillarColor('financial')).toBe('#FBBF24');
    expect(pillarColor('spiritual')).toBe('#C084FC');
    expect(pillarColor('social')).toBe('#F472B6');
    expect(pillarColor('purpose')).toBe('#F97316');
    expect(pillarColor('awareness')).toBe('#14B8A6');
  });

  it('returns gray for unknown pillars', () => {
    expect(pillarColor('unknown')).toBe('#64748B');
  });
});
