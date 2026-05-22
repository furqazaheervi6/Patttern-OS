import React from 'react';
import EvolutionLayout from '../components/EvolutionLayout.jsx';

export default function TwoHundred() {
  return (
    <EvolutionLayout
      codename="200%"
      title="Financial Evolution"
      subtitle="Doubling down. Productive output, milestone velocity, revenue generation, and building financial runway — the material foundation for freedom."
      icon="📈"
      color="#FBBF24"
      metrics={(today) => [
        { label: 'Financial Score', value: today?.financial_score != null ? Math.round(today.financial_score) : null },
        { label: 'Productive Hours', value: today?.productive_hours, unit: 'hrs', icon: '⏱️' },
        { label: 'Milestone', value: today?.milestone_hit ? 'Hit ✓' : 'Pending', icon: '🎯' },
        { label: 'Spending', value: today?.spending_rating ?? today?.spend_rating, unit: '/5', icon: '💳' },
        { label: 'Savings', value: today?.savings_deposited ? 'Yes' : 'No', icon: '🏦' },
      ]}
      trendDataKeys={[
        { key: 'financial_score', label: 'Financial Score', color: '#FBBF24' },
      ]}
      trendTitle="200% — 30-Day Financial Trend"
      domainId="200"
      streakFilter={['checkin']}
      philosophy="200% is not about greed — it is about building enough margin that you can operate from abundance rather than scarcity. Financial evolution means creating systems that compound: skills, products, investments, and relationships that generate returns while you sleep."
      practices={[
        { title: 'Productive Output Tracking', description: 'Measure deep work hours that directly generate value. Quantity × quality = output.', active: true },
        { title: 'Milestone Velocity', description: 'Set weekly milestones and track hit rate. Speed of execution is a compounding advantage.', active: true },
        { title: 'Revenue Architecture', description: 'Build and track revenue streams. Note what generated income and what has potential.', active: true },
        { title: 'Runway Awareness', description: 'Know your burn rate and runway. Financial clarity reduces anxiety and enables bold moves.', active: false },
      ]}
    />
  );
}
