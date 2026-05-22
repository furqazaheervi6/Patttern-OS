// Input validation — replicated from checkin.js for isolated unit testing
function validateCheckin(data) {
  const errors = [];
  if (data.sleep_hours != null && (data.sleep_hours < 0 || data.sleep_hours > 24)) errors.push('sleep_hours must be 0-24');
  if (data.energy_score != null && (data.energy_score < 1 || data.energy_score > 10)) errors.push('energy_score must be 1-10');
  if (data.nutrition_score != null && (data.nutrition_score < 1 || data.nutrition_score > 10)) errors.push('nutrition_score must be 1-10');
  if (data.focus_score != null && (data.focus_score < 1 || data.focus_score > 10)) errors.push('focus_score must be 1-10');
  if (data.mood_score != null && (data.mood_score < 1 || data.mood_score > 10)) errors.push('mood_score must be 1-10');
  if (data.stress_score != null && (data.stress_score < 1 || data.stress_score > 10)) errors.push('stress_score must be 1-10');
  if (data.productive_hours != null && (data.productive_hours < 0 || data.productive_hours > 24)) errors.push('productive_hours must be 0-24');
  if (data.purpose_score != null && (data.purpose_score < 1 || data.purpose_score > 10)) errors.push('purpose_score must be 1-10');
  if (data.alignment_score != null && (data.alignment_score < 1 || data.alignment_score > 10)) errors.push('alignment_score must be 1-10');
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push('date must be YYYY-MM-DD format');
  return errors;
}

describe('validateCheckin', () => {
  it('returns no errors for valid complete data', () => {
    const errors = validateCheckin({
      date: '2025-01-15',
      sleep_hours: 7.5,
      energy_score: 7,
      nutrition_score: 8,
      focus_score: 6,
      mood_score: 8,
      stress_score: 3,
      productive_hours: 6,
      purpose_score: 9,
      alignment_score: 7,
    });
    expect(errors).toEqual([]);
  });

  it('returns no errors for empty data', () => {
    expect(validateCheckin({})).toEqual([]);
  });

  it('returns no errors for null fields', () => {
    expect(validateCheckin({ sleep_hours: null, energy_score: null })).toEqual([]);
  });

  // Sleep hours
  it('rejects negative sleep hours', () => {
    expect(validateCheckin({ sleep_hours: -1 })).toContain('sleep_hours must be 0-24');
  });

  it('rejects sleep hours > 24', () => {
    expect(validateCheckin({ sleep_hours: 25 })).toContain('sleep_hours must be 0-24');
  });

  it('accepts sleep hours at boundaries (0 and 24)', () => {
    expect(validateCheckin({ sleep_hours: 0 })).toEqual([]);
    expect(validateCheckin({ sleep_hours: 24 })).toEqual([]);
  });

  // Score fields (1-10 range)
  const scoreFields = ['energy_score', 'nutrition_score', 'focus_score', 'mood_score', 'stress_score', 'purpose_score', 'alignment_score'];

  for (const field of scoreFields) {
    it(`rejects ${field} below 1`, () => {
      expect(validateCheckin({ [field]: 0 })).toContain(`${field} must be 1-10`);
    });

    it(`rejects ${field} above 10`, () => {
      expect(validateCheckin({ [field]: 11 })).toContain(`${field} must be 1-10`);
    });

    it(`accepts ${field} at boundaries (1 and 10)`, () => {
      expect(validateCheckin({ [field]: 1 })).toEqual([]);
      expect(validateCheckin({ [field]: 10 })).toEqual([]);
    });

    it(`accepts ${field} at midpoint 5`, () => {
      expect(validateCheckin({ [field]: 5 })).toEqual([]);
    });
  }

  // Productive hours
  it('rejects negative productive hours', () => {
    expect(validateCheckin({ productive_hours: -1 })).toContain('productive_hours must be 0-24');
  });

  it('rejects productive hours > 24', () => {
    expect(validateCheckin({ productive_hours: 25 })).toContain('productive_hours must be 0-24');
  });

  // Date format
  it('accepts valid YYYY-MM-DD date', () => {
    expect(validateCheckin({ date: '2025-06-15' })).toEqual([]);
  });

  it('rejects date in MM/DD/YYYY format', () => {
    expect(validateCheckin({ date: '06/15/2025' })).toContain('date must be YYYY-MM-DD format');
  });

  it('rejects text date', () => {
    expect(validateCheckin({ date: 'not-a-date' })).toContain('date must be YYYY-MM-DD format');
  });

  it('rejects incomplete date (missing day)', () => {
    expect(validateCheckin({ date: '2025-06' })).toContain('date must be YYYY-MM-DD format');
  });

  // Multiple errors
  it('returns multiple errors for multiple invalid fields', () => {
    const errors = validateCheckin({
      sleep_hours: -1,
      energy_score: 15,
      date: 'bad',
    });
    expect(errors.length).toBe(3);
    expect(errors).toContain('sleep_hours must be 0-24');
    expect(errors).toContain('energy_score must be 1-10');
    expect(errors).toContain('date must be YYYY-MM-DD format');
  });
});
