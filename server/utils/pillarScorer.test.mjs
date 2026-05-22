import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  scorePhysical,
  scoreMental,
  scoreFinancial,
  scoreSpiritual,
  scoreOverall,
  computeAllScores,
} = require('./pillarScorer');

describe('scorePhysical', () => {
  it('returns 100 for perfect inputs', () => {
    expect(scorePhysical({
      sleep_hours: 8,
      exercise: true,
      energy_score: 10,
      nutrition_score: 10,
    })).toBe(100);
  });

  it('returns 0 for empty/zero inputs', () => {
    expect(scorePhysical({})).toBe(0);
  });

  it('caps sleep contribution at 25 even if > 8 hours', () => {
    const score = scorePhysical({ sleep_hours: 12, exercise: false, energy_score: 0, nutrition_score: 0 });
    expect(score).toBe(25);
  });

  it('gives 25 for exercise being truthy', () => {
    expect(scorePhysical({ sleep_hours: 0, exercise: true, energy_score: 0, nutrition_score: 0 })).toBe(25);
  });

  it('handles partial data correctly', () => {
    const score = scorePhysical({ sleep_hours: 4, exercise: false, energy_score: 5, nutrition_score: 5 });
    // sleep: (4/8)*25 = 12.5, ex: 0, energy: (5/10)*25=12.5, nutrition: (5/10)*25=12.5 => 37.5 rounds to 38
    expect(score).toBe(38);
  });

  it('treats null values as 0', () => {
    const score = scorePhysical({ sleep_hours: null, exercise: null, energy_score: null, nutrition_score: null });
    expect(score).toBe(0);
  });
});

describe('scoreMental', () => {
  it('returns max achievable score (stress=0 defaults to 5 via || operator)', () => {
    // stress_score=0 is falsy, so (stress_score || 5) = 5 → (10-5)/10*25 = 12.5
    // focus: 30 + mood: 30 + stress: 12.5 + learning: 15 = 87.5 → 88
    expect(scoreMental({
      focus_score: 10,
      mood_score: 10,
      stress_score: 0,
      learning: true,
    })).toBe(88);
  });

  it('returns 98 for minimal stress (stress=1)', () => {
    // stress: (10-1)/10*25 = 22.5 → 30+30+22.5+15 = 97.5 → 98
    expect(scoreMental({
      focus_score: 10,
      mood_score: 10,
      stress_score: 1,
      learning: true,
    })).toBe(98);
  });

  it('returns 0 with all zeros (max stress, no learning)', () => {
    const score = scoreMental({ focus_score: 0, mood_score: 0, stress_score: 10, learning: false });
    expect(score).toBe(0);
  });

  it('inverts stress — lower stress = higher score', () => {
    const lowStress = scoreMental({ focus_score: 5, mood_score: 5, stress_score: 2, learning: false });
    const highStress = scoreMental({ focus_score: 5, mood_score: 5, stress_score: 8, learning: false });
    expect(lowStress).toBeGreaterThan(highStress);
  });

  it('gives 15 for learning being truthy', () => {
    const with_ = scoreMental({ focus_score: 0, mood_score: 0, stress_score: 10, learning: true });
    const without = scoreMental({ focus_score: 0, mood_score: 0, stress_score: 10, learning: false });
    expect(with_ - without).toBe(15);
  });

  it('defaults stress to 5 when not provided', () => {
    const score = scoreMental({ focus_score: 0, mood_score: 0, learning: false });
    // stress defaults to 5: (10-5)/10*25 = 12.5, rounds to 13
    expect(score).toBe(13);
  });
});

describe('scoreFinancial', () => {
  it('returns 100 for perfect inputs', () => {
    expect(scoreFinancial({
      productive_hours: 8,
      milestone_hit: true,
      revenue_note: '$500',
    })).toBe(100);
  });

  it('returns 0 for empty inputs', () => {
    expect(scoreFinancial({})).toBe(0);
  });

  it('caps productive hours contribution at 50', () => {
    const score = scoreFinancial({ productive_hours: 16, milestone_hit: false, revenue_note: '' });
    expect(score).toBe(50);
  });

  it('gives 30 for milestone_hit', () => {
    const with_ = scoreFinancial({ productive_hours: 0, milestone_hit: true, revenue_note: '' });
    const without = scoreFinancial({ productive_hours: 0, milestone_hit: false, revenue_note: '' });
    expect(with_ - without).toBe(30);
  });

  it('gives 20 for meaningful revenue note', () => {
    const with_ = scoreFinancial({ productive_hours: 0, milestone_hit: false, revenue_note: '$100' });
    const without = scoreFinancial({ productive_hours: 0, milestone_hit: false, revenue_note: '' });
    expect(with_ - without).toBe(20);
  });

  it('ignores "$0" as revenue note', () => {
    expect(scoreFinancial({ productive_hours: 0, milestone_hit: false, revenue_note: '$0' })).toBe(0);
  });

  it('ignores whitespace-only revenue note', () => {
    expect(scoreFinancial({ productive_hours: 0, milestone_hit: false, revenue_note: '   ' })).toBe(0);
  });
});

describe('scoreSpiritual', () => {
  it('returns 100 for perfect inputs', () => {
    expect(scoreSpiritual({
      reflection_done: true,
      purpose_score: 10,
      gratitude_done: true,
      alignment_score: 10,
    })).toBe(100);
  });

  it('returns 0 for empty inputs', () => {
    expect(scoreSpiritual({})).toBe(0);
  });

  it('gives 25 for reflection', () => {
    expect(scoreSpiritual({ reflection_done: true, purpose_score: 0, gratitude_done: false, alignment_score: 0 })).toBe(25);
  });

  it('gives 20 for gratitude', () => {
    expect(scoreSpiritual({ reflection_done: false, purpose_score: 0, gratitude_done: true, alignment_score: 0 })).toBe(20);
  });

  it('handles partial purpose and alignment scores', () => {
    const score = scoreSpiritual({ reflection_done: false, purpose_score: 5, gratitude_done: false, alignment_score: 5 });
    expect(score).toBe(28);
  });
});

describe('scoreOverall', () => {
  it('returns average of four pillars', () => {
    expect(scoreOverall(80, 60, 40, 20)).toBe(50);
  });

  it('returns 100 when all pillars are 100', () => {
    expect(scoreOverall(100, 100, 100, 100)).toBe(100);
  });

  it('returns 0 when all pillars are 0', () => {
    expect(scoreOverall(0, 0, 0, 0)).toBe(0);
  });
});

describe('computeAllScores', () => {
  it('returns all five score fields', () => {
    const result = computeAllScores({
      sleep_hours: 7, exercise: true, energy_score: 7, nutrition_score: 6,
      focus_score: 8, mood_score: 7, stress_score: 3, learning: true,
      productive_hours: 6, milestone_hit: false, revenue_note: '',
      reflection_done: true, purpose_score: 8, gratitude_done: true, alignment_score: 7,
    });

    expect(result).toHaveProperty('physical_score');
    expect(result).toHaveProperty('mental_score');
    expect(result).toHaveProperty('financial_score');
    expect(result).toHaveProperty('spiritual_score');
    expect(result).toHaveProperty('overall_score');

    for (const key of Object.keys(result)) {
      expect(typeof result[key]).toBe('number');
      expect(result[key]).toBeGreaterThanOrEqual(0);
      expect(result[key]).toBeLessThanOrEqual(100);
    }
  });

  it('returns max scores for best possible data', () => {
    const result = computeAllScores({
      sleep_hours: 8, exercise: true, energy_score: 10, nutrition_score: 10,
      focus_score: 10, mood_score: 10, stress_score: 1, learning: true,
      productive_hours: 8, milestone_hit: true, revenue_note: '$500',
      reflection_done: true, purpose_score: 10, gratitude_done: true, alignment_score: 10,
    });
    expect(result.physical_score).toBe(100);
    expect(result.mental_score).toBe(98); // stress=1 → max mental is 98
    expect(result.financial_score).toBe(100);
    expect(result.spiritual_score).toBe(100);
    expect(result.overall_score).toBe(100); // (100+98+100+100)/4 = 99.5 → 100
  });

  it('handles empty data without crashing', () => {
    const result = computeAllScores({});
    expect(result.physical_score).toBe(0);
    expect(result.overall_score).toBeGreaterThanOrEqual(0);
  });
});
