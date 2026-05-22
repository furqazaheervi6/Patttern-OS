import React from 'react';
import EvolutionLayout from '../components/EvolutionLayout.jsx';

export default function Sojourney() {
  return (
    <EvolutionLayout
      codename="Sojourney"
      title="Psychological Evolution"
      subtitle="The inner journey. Emotional regulation, stress mastery, self-awareness, and the ongoing work of becoming psychologically resilient and integrated."
      icon="🧭"
      color="#F472B6"
      metrics={(today) => {
        const moodVal = today?.mood_score ?? today?.mood_rating;
        const stressVal = today?.stress_score ?? today?.stress_level;
        return [
          { label: 'Emotional Balance', value: moodVal != null && stressVal != null ? Math.round(((moodVal / 10) * 50) + (((10 - stressVal) / 10) * 50)) : null },
          { label: 'Mood', value: moodVal, unit: '/10', icon: '😊' },
          { label: 'Stress', value: stressVal, unit: '/10', icon: '🌊' },
          { label: 'Mental Score', value: today?.mental_score != null ? Math.round(today.mental_score) : null, unit: '/100', icon: '🧠' },
        ];
      }}
      trendDataKeys={[
        { key: 'mental_score', label: 'Mental Score', color: '#F472B6' },
      ]}
      trendTitle="Sojourney — 30-Day Emotional Trend"
      domainId="sojourney"
      streakFilter={['checkin']}
      philosophy="Psychology is not a destination but a sojourn — a journey through internal landscapes that shift with every experience. The goal is not the absence of struggle but the capacity to move through it with awareness, honesty, and grace."
      practices={[
        { title: 'Emotional Check-In', description: 'Daily mood rating with honest self-assessment. Name the emotion, don\'t suppress it.', active: true },
        { title: 'Stress Awareness', description: 'Track stress levels and their triggers. Build a map of what drains vs. restores you.', active: true },
        { title: 'Shadow Integration', description: 'Notice reactive patterns, projections, and avoidance. Bring unconscious material into awareness.', active: false },
        { title: 'Therapeutic Practice', description: 'Journaling, therapy, or structured self-reflection. Process rather than accumulate.', active: true },
      ]}
    />
  );
}
