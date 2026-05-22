import React from 'react';
import EvolutionLayout from '../components/EvolutionLayout.jsx';
import CorrelationPanel from '../components/CorrelationPanel.jsx';

export default function Omnivision() {
  return (
    <EvolutionLayout
      codename="Omnivision"
      title="Cognitive Evolution"
      subtitle="Seeing the whole board. Systems thinking, pattern recognition, meta-cognition, and the ability to hold multiple perspectives simultaneously."
      icon="👁️"
      color="#06B6D4"
      domainId="omnivision"
      streakFilter={['checkin', 'learning']}
      metrics={(today, history) => {
        const recentDays = (history || []).slice(0, 7);
        const avgOverall = recentDays.length
          ? Math.round(recentDays.reduce((s, d) => s + (d.overall_score || 0), 0) / recentDays.length)
          : null;
        const variance = recentDays.length > 1
          ? Math.round(Math.sqrt(recentDays.reduce((s, d) => {
              const diff = (d.overall_score || 0) - (avgOverall || 0);
              return s + diff * diff;
            }, 0) / recentDays.length))
          : null;
        return [
          { label: 'Cognitive Index', value: avgOverall },
          { label: '7-Day Average', value: avgOverall, unit: '/100', icon: '📊' },
          { label: 'Stability', value: variance != null ? (100 - Math.min(variance * 2, 100)) : null, unit: '/100', icon: '⚖️' },
          { label: 'Focus', value: today?.focus_score ?? today?.focus_hours, unit: today?.focus_score ? '/10' : 'hrs', icon: '🔬' },
          { label: 'Learning', value: today?.learning ? 'Active' : 'Idle', icon: '🧩' },
        ];
      }}
      trendDataKeys={[
        { key: 'overall_score', label: 'Overall Score', color: '#06B6D4' },
        { key: 'mental_score', label: 'Mental', color: '#60A5FA' },
      ]}
      trendTitle="Omnivision — Cognitive Performance & Cross-Pillar Patterns"
      philosophy="Omnivision is the cognitive capacity to see patterns where others see noise, connections where others see isolation, and systems where others see events. It is the meta-skill that enhances every other domain — the ability to think about thinking."
      practices={[
        { title: 'Systems Thinking', description: 'Look for feedback loops, second-order effects, and emergent patterns across all life domains.', active: true },
        { title: 'Cross-Domain Pattern Recognition', description: 'When physical score drops, what happens to mental? Find the hidden correlations.', active: true },
        { title: 'Meta-Cognition', description: 'Observe your own thought patterns. Notice biases, assumptions, and mental models in real-time.', active: false },
        { title: 'Perspective Shifting', description: 'Deliberately adopt opposing viewpoints. Strengthen arguments against your own positions.', active: false },
      ]}
    >
      {/* Correlation Panel — unique to Omnivision */}
      <div className="mb-6">
        <CorrelationPanel />
      </div>
    </EvolutionLayout>
  );
}
