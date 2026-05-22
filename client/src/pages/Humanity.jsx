import React from 'react';
import EvolutionLayout from '../components/EvolutionLayout.jsx';

export default function Humanity() {
  return (
    <EvolutionLayout
      codename="Humanity"
      title="Ontological Evolution"
      subtitle="The question of being. Who are you becoming? Ontological evolution is the integration of all domains into a coherent identity — the evolution of your relationship with existence itself."
      icon="∞"
      color="#F97316"
      metrics={(today, history) => {
        const pillars = ['physical_score', 'mental_score', 'financial_score', 'spiritual_score'];
        const scores = pillars.map(p => today?.[p]).filter(v => v != null);
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
        const min = scores.length ? Math.round(Math.min(...scores)) : null;
        const max = scores.length ? Math.round(Math.max(...scores)) : null;
        const balance = min != null && max != null ? Math.round(100 - (max - min)) : null;

        return [
          { label: 'Integration Index', value: avg },
          { label: 'Overall', value: today?.overall_score != null ? Math.round(today.overall_score) : null, unit: '/100', icon: '◎' },
          { label: 'Balance', value: balance, unit: '/100', icon: '⚖️' },
          { label: 'Weakest Link', value: min, unit: '/100', icon: '🔗' },
          { label: 'Peak Domain', value: max, unit: '/100', icon: '⭐' },
        ];
      }}
      trendDataKeys={[
        { key: 'overall_score', label: 'Overall', color: '#F97316' },
        { key: 'physical_score', label: 'Physical', color: '#22C55E' },
        { key: 'mental_score', label: 'Mental', color: '#60A5FA' },
        { key: 'financial_score', label: 'Financial', color: '#FBBF24' },
        { key: 'spiritual_score', label: 'Spiritual', color: '#C084FC' },
      ]}
      trendTitle="Humanity — All Domains Unified"
      domainId="humanity"
      streakFilter={['checkin', 'exercise', 'meditation', 'learning', 'gratitude']}
      philosophy="Ontology asks the most fundamental question: what does it mean to be? Humanity is the evolution of your being — not just what you do, but who you are becoming. It is the integration point where physical discipline, psychological depth, mental sharpness, spiritual alignment, cognitive breadth, and financial freedom converge into a coherent, evolving self."
      practices={[
        { title: 'Integration Review', description: 'Weekly assessment of how well all domains are working together. Where is the friction?', active: true },
        { title: 'Identity Coherence', description: 'Are your actions, values, and goals aligned? Notice where you are living someone else\'s definition of success.', active: true },
        { title: 'Balance Calibration', description: 'When one domain dominates at the expense of others, recalibrate. Sustainable growth is balanced growth.', active: true },
        { title: 'Becoming Audit', description: 'Who are you becoming? Periodically zoom out and assess the trajectory, not just the position.', active: false },
      ]}
    />
  );
}
