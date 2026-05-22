import React from 'react';
import EvolutionLayout from '../components/EvolutionLayout.jsx';

export default function Kaizen() {
  return (
    <EvolutionLayout
      codename="Kaizen"
      title="Mental Evolution"
      subtitle="Continuous improvement. Focus mastery, learning velocity, intellectual growth, and the compounding power of 1% daily gains in mental performance."
      icon="📐"
      color="#60A5FA"
      metrics={(today) => {
        const focusVal = today?.focus_score ?? today?.focus_hours;
        return [
          { label: 'Mental Score', value: today?.mental_score != null ? Math.round(today.mental_score) : null },
          { label: 'Focus', value: focusVal, unit: today?.focus_score ? '/10' : 'hrs', icon: '🎯' },
          { label: 'Learning', value: today?.learning ? 'Yes' : 'No', icon: '📚' },
          { label: 'Mood', value: today?.mood_score ?? today?.mood_rating, unit: '/10', icon: '💡' },
        ];
      }}
      trendDataKeys={[
        { key: 'mental_score', label: 'Mental Score', color: '#60A5FA' },
      ]}
      trendTitle="Kaizen — 30-Day Mental Performance"
      domainId="kaizen"
      streakFilter={['learning']}
      philosophy="Kaizen is the philosophy that small, continuous improvements compound into transformation. One percent better every day is 37x better in a year. The mind grows not through grand gestures but through relentless, patient refinement."
      practices={[
        { title: 'Deep Focus Blocks', description: 'Track hours of uninterrupted, high-quality focus. Protect your peak cognitive windows.', active: true },
        { title: 'Daily Learning', description: 'Commit to learning something new each day — reading, courses, experimentation, deliberate practice.', active: true },
        { title: 'Cognitive Load Management', description: 'Reduce decision fatigue, context-switching, and mental clutter. Systems over willpower.', active: true },
        { title: 'Reflection Loop', description: 'End-of-day review: what did I learn? What would I do differently? Encode insights into systems.', active: false },
      ]}
    />
  );
}
