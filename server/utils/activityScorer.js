/**
 * Activity-based dynamic scoring system.
 *
 * Each user-defined activity has:
 *   - domain: physical | mental | financial | spiritual
 *   - impact: positive | negative
 *   - weight: 1-5 (intensity multiplier)
 *
 * Algorithm:
 *   1. For each pillar, gather all activities logged today in that domain
 *   2. Compute modifier = sum of (impact_sign * weight * POINTS_PER_WEIGHT * intensity)
 *   3. Cap modifier at ±MAX_MODIFIER to prevent extreme swings
 *   4. Apply: final_score = clamp(base_score + modifier, 0, 100)
 *
 * The scoring is intentionally generous for positives and punitive for negatives
 * to reinforce good habits and create real consequences for bad ones.
 */

const POINTS_PER_WEIGHT = 3; // Each weight point = 3 score points (weight 5 = 15 pts)
const MAX_MODIFIER = 30;     // Cap total modifier at ±30 points per pillar

/**
 * Compute per-pillar score modifiers from today's activity log.
 * @param {Array} dailyActivities - Join of daily_activities + activities for one day
 *   Each: { activity_id, domain, impact, weight, intensity }
 * @returns {Object} { physical: number, mental: number, financial: number, spiritual: number }
 */
function computeActivityModifiers(dailyActivities) {
  const modifiers = { physical: 0, mental: 0, financial: 0, spiritual: 0 };

  for (const entry of dailyActivities) {
    const domain = entry.domain;
    if (!modifiers.hasOwnProperty(domain)) continue;

    const sign = entry.impact === 'negative' ? -1 : 1;
    const points = sign * (entry.weight || 3) * POINTS_PER_WEIGHT * (entry.intensity || 1);
    modifiers[domain] += points;
  }

  // Clamp each modifier
  for (const key of Object.keys(modifiers)) {
    modifiers[key] = Math.max(-MAX_MODIFIER, Math.min(MAX_MODIFIER, Math.round(modifiers[key])));
  }

  return modifiers;
}

/**
 * Apply activity modifiers to base pillar scores.
 * @param {Object} baseScores - { physical_score, mental_score, financial_score, spiritual_score }
 * @param {Object} modifiers - Output from computeActivityModifiers
 * @returns {Object} Adjusted scores with overall recalculated
 */
function applyModifiers(baseScores, modifiers) {
  const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

  const adjusted = {
    physical_score: clamp((baseScores.physical_score || 0) + (modifiers.physical || 0)),
    mental_score: clamp((baseScores.mental_score || 0) + (modifiers.mental || 0)),
    financial_score: clamp((baseScores.financial_score || 0) + (modifiers.financial || 0)),
    spiritual_score: clamp((baseScores.spiritual_score || 0) + (modifiers.spiritual || 0)),
  };

  adjusted.overall_score = Math.round(
    (adjusted.physical_score + adjusted.mental_score + adjusted.financial_score + adjusted.spiritual_score) / 4
  );

  return adjusted;
}

/**
 * Get a breakdown of how activities affected each pillar.
 * @param {Array} dailyActivities - Same input as computeActivityModifiers
 * @returns {Object} Per-pillar breakdown with individual contributions
 */
function getActivityBreakdown(dailyActivities) {
  const breakdown = {
    physical: { positive: [], negative: [], net: 0 },
    mental: { positive: [], negative: [], net: 0 },
    financial: { positive: [], negative: [], net: 0 },
    spiritual: { positive: [], negative: [], net: 0 },
  };

  for (const entry of dailyActivities) {
    const domain = entry.domain;
    if (!breakdown[domain]) continue;

    const sign = entry.impact === 'negative' ? -1 : 1;
    const points = sign * (entry.weight || 3) * POINTS_PER_WEIGHT * (entry.intensity || 1);
    const detail = {
      name: entry.name,
      icon: entry.icon || '',
      weight: entry.weight,
      impact: entry.impact,
      intensity: entry.intensity || 1,
      points: Math.round(points),
    };

    if (sign > 0) {
      breakdown[domain].positive.push(detail);
    } else {
      breakdown[domain].negative.push(detail);
    }
    breakdown[domain].net += points;
  }

  // Clamp net values
  for (const key of Object.keys(breakdown)) {
    breakdown[key].net = Math.max(-MAX_MODIFIER, Math.min(MAX_MODIFIER, Math.round(breakdown[key].net)));
  }

  return breakdown;
}

module.exports = {
  computeActivityModifiers,
  applyModifiers,
  getActivityBreakdown,
  POINTS_PER_WEIGHT,
  MAX_MODIFIER,
};
