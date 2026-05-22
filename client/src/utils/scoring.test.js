import { describe, it, expect } from 'vitest';
import {
  scorePhysical,
  scoreMental,
  scoreFinancial,
  scoreSpiritual,
  scoreColor,
  scoreClass,
} from './scoring.js';

describe('scorePhysical', () => {
  it('returns 100 for perfect inputs', () => {
    expect(scorePhysical({ sleep_hours: 8, exercise: true, energy_score: 10, nutrition_score: 10 })).toBe(100);
  });

  it('returns 0 for empty inputs', () => {
    expect(scorePhysical({})).toBe(0);
  });

  it('caps sleep contribution at 25', () => {
    expect(scorePhysical({ sleep_hours: 12, exercise: false, energy_score: 0, nutrition_score: 0 })).toBe(25);
  });

  it('handles fractional sleep hours', () => {
    const score = scorePhysical({ sleep_hours: 6.5, exercise: false, energy_score: 0, nutrition_score: 0 });
    expect(score).toBe(Math.round((6.5 / 8) * 25));
  });
});

describe('scoreMental', () => {
  it('returns 98 for best achievable inputs (stress=1)', () => {
    // stress=0 is falsy, defaults to 5 via ||. stress=1 gives max: (10-1)/10*25=22.5
    expect(scoreMental({ focus_score: 10, mood_score: 10, stress_score: 1, learning: true })).toBe(98);
  });

  it('inverts stress — low stress = high score', () => {
    const low = scoreMental({ focus_score: 0, mood_score: 0, stress_score: 1, learning: false });
    const high = scoreMental({ focus_score: 0, mood_score: 0, stress_score: 9, learning: false });
    expect(low).toBeGreaterThan(high);
  });
});

describe('scoreFinancial', () => {
  it('returns 100 for perfect inputs', () => {
    expect(scoreFinancial({ productive_hours: 8, milestone_hit: true, revenue_note: '$500' })).toBe(100);
  });

  it('returns 0 for empty inputs', () => {
    expect(scoreFinancial({})).toBe(0);
  });

  it('ignores $0 revenue note', () => {
    expect(scoreFinancial({ productive_hours: 0, milestone_hit: false, revenue_note: '$0' })).toBe(0);
  });
});

describe('scoreSpiritual', () => {
  it('returns 100 for perfect inputs', () => {
    expect(scoreSpiritual({ reflection_done: true, purpose_score: 10, gratitude_done: true, alignment_score: 10 })).toBe(100);
  });

  it('returns 0 for empty inputs', () => {
    expect(scoreSpiritual({})).toBe(0);
  });
});

describe('scoreColor', () => {
  it('returns green for score >= 75', () => {
    expect(scoreColor(75)).toBe('#22C55E');
    expect(scoreColor(100)).toBe('#22C55E');
    expect(scoreColor(85)).toBe('#22C55E');
  });

  it('returns yellow for score >= 50 and < 75', () => {
    expect(scoreColor(50)).toBe('#FBBF24');
    expect(scoreColor(74)).toBe('#FBBF24');
    expect(scoreColor(60)).toBe('#FBBF24');
  });

  it('returns red for score < 50', () => {
    expect(scoreColor(49)).toBe('#F87171');
    expect(scoreColor(0)).toBe('#F87171');
    expect(scoreColor(25)).toBe('#F87171');
  });
});

describe('scoreClass', () => {
  it('returns score-green for >= 75', () => {
    expect(scoreClass(75)).toBe('score-green');
    expect(scoreClass(100)).toBe('score-green');
  });

  it('returns score-yellow for >= 50 and < 75', () => {
    expect(scoreClass(50)).toBe('score-yellow');
    expect(scoreClass(74)).toBe('score-yellow');
  });

  it('returns score-red for < 50', () => {
    expect(scoreClass(0)).toBe('score-red');
    expect(scoreClass(49)).toBe('score-red');
  });
});
