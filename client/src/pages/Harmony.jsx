import React from 'react';
import EvolutionLayout from '../components/EvolutionLayout.jsx';

export default function Harmony() {
  return (
    <EvolutionLayout
      codename="Harmony"
      title="Spiritual Evolution"
      subtitle="Alignment with purpose. Meditation, gratitude, reflection, and the cultivation of inner coherence — living in resonance with your deepest values."
      icon="🕉️"
      color="#C084FC"
      metrics={(today) => {
        const meditationVal = today?.reflection_done ?? today?.meditation;
        return [
          { label: 'Spiritual Score', value: today?.spiritual_score != null ? Math.round(today.spiritual_score) : null },
          { label: 'Purpose', value: today?.purpose_score ?? today?.purpose_rating, unit: '/10', icon: '🧿' },
          { label: 'Gratitude', value: today?.gratitude_done ?? today?.gratitude_count, icon: '🙏' },
          { label: 'Reflection', value: meditationVal ? 'Yes' : 'No', icon: '🪷' },
          { label: 'Alignment', value: today?.alignment_score, unit: '/10', icon: '☯️' },
        ];
      }}
      trendDataKeys={[
        { key: 'spiritual_score', label: 'Spiritual Score', color: '#C084FC' },
      ]}
      trendTitle="Harmony — 30-Day Spiritual Trend"
      domainId="harmony"
      streakFilter={['meditation', 'gratitude']}
      philosophy="Harmony is not the absence of discord — it is the ability to hold complexity without losing center. Spiritual evolution is the practice of returning, again and again, to what matters most, until the return becomes the resting state."
      practices={[
        { title: 'Meditation / Stillness', description: 'Daily practice of presence. Even 5 minutes of intentional stillness rewires the nervous system.', active: true },
        { title: 'Gratitude Practice', description: 'Name specific things you\'re grateful for. Gratitude is attention directed at abundance.', active: true },
        { title: 'Purpose Alignment', description: 'Rate how aligned your day was with your deeper purpose. Notice the gaps.', active: true },
        { title: 'Values Audit', description: 'Periodically check: are your actions reflecting your stated values? Where is the drift?', active: false },
      ]}
    />
  );
}
