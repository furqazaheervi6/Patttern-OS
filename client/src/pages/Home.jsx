import React, { useState } from 'react';
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

  const prevDay = history.find((d) => d.date !== today?.date);
  const prevScores = prevDay
    ? {
        physical: prevDay.physical_score,
        mental: prevDay.mental_score,
        financial: prevDay.financial_score,
        spiritual: prevDay.spiritual_score,
      }
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-text-primary">Dashboard</h1>
          <p className="text-xs text-text-muted mt-0.5 font-mono">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {today && (
            <span className="text-xs px-3 py-1 rounded-full border border-physical/30 text-physical bg-physical/10 font-mono">
              ✓ Checked in today
            </span>
          )}
          <button
            onClick={() => setShowCheckIn(true)}
            className="btn-primary"
          >
            {today ? '✎ Edit Check-In' : '+ Check In'}
          </button>
        </div>
      </div>

      {/* Overall Score */}
      {todayScores?.overall != null && (
        <div className="mb-6 px-5 py-3 rounded-xl border border-border bg-surface flex items-center gap-4 fade-in">
          <div>
            <p className="text-xs text-text-muted font-mono">Overall Score</p>
            <p
              className="font-display font-bold text-3xl"
              style={{
                color:
                  todayScores.overall >= 75
                    ? '#22C55E'
                    : todayScores.overall >= 50
                    ? '#FBBF24'
                    : '#F87171',
              }}
            >
              {todayScores.overall}
            </p>
          </div>
          <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${todayScores.overall}%`,
                background: 'linear-gradient(90deg, #60A5FA, #C084FC)',
              }}
            />
          </div>
          <span className="text-xs text-text-muted font-mono">/100</span>
        </div>
      )}

      {/* Pillar Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {PILLARS.map((pillar, i) => (
          <PillarCard
            key={pillar}
            pillar={pillar}
            score={todayScores?.[pillar] ?? null}
            prevScore={prevScores?.[pillar] ?? null}
            history={history}
            index={i}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <TrendChart data={history} />
        </div>
        <div>
          <BalanceRing thisWeek={thisWeek} lastWeek={lastWeek} />
        </div>
      </div>

      {/* Streaks */}
      <div className="mb-6">
        <StreakBar />
      </div>

      {/* Activity Impact */}
      <div className="mb-6">
        <ActivityImpact />
      </div>

      {/* Pattern Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <PatternAlert alerts={alerts} onDismiss={dismissAlert} />
        </div>
      )}

      {/* Bottom Row — Notion + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
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
