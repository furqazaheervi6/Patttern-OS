export function scorePhysical({ sleep_hours, exercise, energy_score, nutrition_score }) {
  const sleep = Math.min(((sleep_hours || 0) / 8) * 25, 25);
  const ex = (exercise ? 1 : 0) * 25;
  const energy = ((energy_score || 0) / 10) * 25;
  const nutrition = ((nutrition_score || 0) / 10) * 25;
  return Math.round(sleep + ex + energy + nutrition);
}

export function scoreMental({ focus_score, mood_score, stress_score, learning }) {
  const focus = ((focus_score || 0) / 10) * 30;
  const mood = ((mood_score || 0) / 10) * 30;
  const stress = ((10 - (stress_score || 5)) / 10) * 25;
  const learn = (learning ? 1 : 0) * 15;
  return Math.round(focus + mood + stress + learn);
}

export function scoreFinancial({ productive_hours, milestone_hit, revenue_note }) {
  const hours = Math.min(((productive_hours || 0) / 8) * 50, 50);
  const milestone = (milestone_hit ? 1 : 0) * 30;
  const revenue = revenue_note && revenue_note !== '$0' && revenue_note.trim() !== '' ? 20 : 0;
  return Math.round(hours + milestone + revenue);
}

export function scoreSpiritual({ reflection_done, purpose_score, gratitude_done, alignment_score }) {
  const reflection = (reflection_done ? 1 : 0) * 25;
  const purpose = ((purpose_score || 0) / 10) * 30;
  const gratitude = (gratitude_done ? 1 : 0) * 20;
  const alignment = ((alignment_score || 0) / 10) * 25;
  return Math.round(reflection + purpose + gratitude + alignment);
}

export function scoreColor(score) {
  if (score >= 75) return '#22C55E';
  if (score >= 50) return '#FBBF24';
  return '#F87171';
}

export function scoreClass(score) {
  if (score >= 75) return 'score-green';
  if (score >= 50) return 'score-yellow';
  return 'score-red';
}
