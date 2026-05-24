import React, { useState, useEffect } from 'react';

function OverallBar({ pct, color }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 120); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height: '100%', width: `${w}%`, background: `linear-gradient(90deg, #8B0000, ${color})`, borderRadius: '3px', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
  );
}
import { format } from 'date-fns';
import PillarCard from '../components/PillarCard.jsx';
import TrendChart from '../components/TrendChart.jsx';
import BalanceRing from '../components/BalanceRing.jsx';
import StreakBar from '../components/StreakBar.jsx';
import { DashboardSkeleton } from '../components/Skeleton.jsx';
import WeeklyDigest from '../components/WeeklyDigest.jsx';
import PatternAlert from '../components/PatternAlert.jsx';
import NotionFeed from '../components/NotionFeed.jsx';
import CalendarWidget from '../components/CalendarWidget.jsx';
import CheckIn from '../components/CheckIn.jsx';
import ActivityImpact from '../components/ActivityImpact.jsx';
import { usePillarData, useWeekComparison } from '../hooks/usePillarData.js';

const PILLARS = ['physical', 'mental', 'financial', 'spiritual'];

export default function Home() {
  const { history, today, alerts, loading, refetch, dismissAlert } = usePillarData(30);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const { thisWeek, lastWeek } = useWeekComparison(history);

  if (loading) return <DashboardSkeleton />;

  const todayScores = today
    ? {
        physical: today.physical_score,
        mental: today.mental_score,
        financial: today.financial_score,
        spiritual: today.spiritual_score,
        overall: today.overall_score,
      }
    : null;

  const pillarHasData = today ? {
    physical: !!(today.sleep_hours || today.exercise || today.energy_score || today.nutrition_score),
    mental: !!(today.focus_score || today.mood_score || today.stress_score || today.learning),
    financial: !!(today.productive_hours || today.milestone_hit || (today.revenue_note && today.revenue_note.trim())),
    spiritual: !!(today.reflection_done || today.purpose_score || today.gratitude_done || today.alignment_score),
  } : { physical: false, mental: false, financial: false, spiritual: false };

  const prevDay = history.find((d) => d.date !== today?.date);
  const prevScores = prevDay
    ? {
        physical: prevDay.physical_score,
        mental: prevDay.mental_score,
        financial: prevDay.financial_score,
        spiritual: prevDay.spiritual_score,
      }
    : null;

  const overallColor =
    todayScores?.overall >= 75 ? '#22C55E'
    : todayScores?.overall >= 50 ? '#FBBF24'
    : '#F87171';

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 fade-in">
        <div>
          <h1
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#C9C9C9',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              lineHeight: 1.1,
              marginBottom: '6px',
            }}
          >
            Intelligence
          </h1>
          <p
            style={{
              fontSize: '0.65rem',
              color: '#3A3A50',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            {format(new Date(), 'EEEE · MMMM d · yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {today && (
            <span
              style={{
                fontSize: '0.6rem',
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(34,197,94,0.2)',
                color: '#22C55E',
                background: 'rgba(34,197,94,0.06)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'DM Mono, monospace',
              }}
            >
              ✓ checked in
            </span>
          )}
          <button
            onClick={() => setShowCheckIn(true)}
            className="btn-primary"
          >
            {today ? 'Edit Check-In' : '+ Check In'}
          </button>
        </div>
      </div>

      {/* Overall Score Banner */}
      {todayScores?.overall != null && (
        <div
          className="mb-4 fade-in"
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'rgba(28,28,46,0.9)',
            border: '1px solid #2E2E48',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div style={{ minWidth: '80px' }}>
            <p
              style={{
                fontSize: '0.6rem',
                color: '#3A3A50',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontFamily: 'DM Mono, monospace',
                marginBottom: '2px',
              }}
            >
              Overall
            </p>
            <p
              style={{
                fontFamily: 'Cinzel, Georgia, serif',
                fontSize: '2rem',
                fontWeight: 700,
                color: overallColor,
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {todayScores.overall}
            </p>
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                height: '3px',
                borderRadius: '3px',
                background: '#1A1A2A',
                overflow: 'hidden',
              }}
            >
              <OverallBar pct={todayScores.overall} color={overallColor} />
            </div>
          </div>

          <span
            style={{
              fontSize: '0.6rem',
              color: '#3A3A50',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            /100
          </span>
        </div>
      )}

      {/* Pillar Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {PILLARS.map((pillar, i) => (
          <PillarCard
            key={pillar}
            pillar={pillar}
            score={todayScores?.[pillar] ?? null}
            prevScore={prevScores?.[pillar] ?? null}
            history={history}
            index={i}
            hasData={pillarHasData[pillar]}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="divider-hellenic" />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <div className="lg:col-span-2">
          <TrendChart data={history} />
        </div>
        <div>
          <BalanceRing thisWeek={thisWeek} lastWeek={lastWeek} />
        </div>
      </div>

      {/* Streaks */}
      <div className="mb-4">
        <StreakBar />
      </div>

      {/* Activity Impact */}
      <div className="mb-4">
        <ActivityImpact />
      </div>

      {/* Pattern Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <PatternAlert alerts={alerts} onDismiss={dismissAlert} />
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <NotionFeed />
        <CalendarWidget />
      </div>

      {/* Weekly Digest */}
      <WeeklyDigest />

      {/* Check-In Modal */}
      {showCheckIn && (
        <CheckIn
          existing={today}
          onClose={() => setShowCheckIn(false)}
          onSaved={() => {
            setShowCheckIn(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
