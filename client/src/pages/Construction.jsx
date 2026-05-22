import React from 'react';
import EvolutionLayout from '../components/EvolutionLayout.jsx';

export default function Construction() {
  return (
    <EvolutionLayout
      codename="Construction"
      title="Physical Evolution"
      subtitle="Building the vessel. Sleep architecture, movement patterns, energy systems, and nutritional foundation — the hardware layer of human performance."
      icon="🏗️"
      color="#22C55E"
      metrics={(today) => [
        { label: 'Physical Score', value: today?.physical_score != null ? Math.round(today.physical_score) : null },
        { label: 'Sleep', value: today?.sleep_hours, unit: 'hrs', icon: '🌙' },
        { label: 'Exercise', value: today?.exercise ? 'Yes' : 'No', icon: '💪' },
        { label: 'Energy', value: today?.energy_score, unit: '/10', icon: '⚡' },
        { label: 'Nutrition', value: today?.nutrition_score, unit: '/10', icon: '🥗' },
      ]}
      trendDataKeys={[
        { key: 'physical_score', label: 'Physical Score', color: '#22C55E' },
      ]}
      trendTitle="Construction — 30-Day Physical Trend"
      domainId="construction"
      streakFilter={['exercise', 'sleep7plus']}
      philosophy="The body is not separate from the mind — it is the mind's first instrument. Construction is the discipline of treating your biology as architecture: every sleep cycle is a renovation, every workout a load-bearing wall, every meal a material choice."
      practices={[
        { title: 'Sleep Architecture', description: 'Consistent 7-9hr sleep with tracked quality. Optimize environment, timing, and wind-down ritual.', active: true },
        { title: 'Movement Protocol', description: 'Daily exercise — strength, cardio, or mobility. Track consistency over intensity.', active: true },
        { title: 'Energy Mapping', description: 'Rate daily energy to identify patterns. Correlate with sleep, nutrition, and stress.', active: true },
        { title: 'Nutritional Foundation', description: 'Score daily nutrition quality. Hydration, whole foods, and mindful eating.', active: true },
      ]}
    />
  );
}
