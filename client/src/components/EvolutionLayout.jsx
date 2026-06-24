import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usePillarData } from '../hooks/usePillarData.js';
import { formatDate } from '../utils/formatters.js';
import StreakBar from './StreakBar.jsx';
import GoalTracker from './GoalTracker.jsx';
import DomainCheckIn from './DomainCheckIn.jsx';
import ComparisonWidget from './ComparisonWidget.jsx';
import { EvolutionSkeleton } from './Skeleton.jsx';

function MetricCard({ label, value, unit, color, icon }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-text-muted font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display font-bold text-3xl" style={{ color }}>
          {value ?? '—'}
        </span>
        {unit && <span className="text-xs text-text-muted font-mono">{unit}</span>}
      </div>
    </div>
  );
}

function DomainTrend({ data, dataKeys, color, title }) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="card">
      <h3 className="font-display font-semibold text-sm text-text-primary mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={sorted} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <defs>
            {dataKeys.map(dk => (
              <linearGradient key={dk.key} id={`grad-${(dk.color || color).replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={dk.color || color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={dk.color || color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#1E1E2E" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date" tickFormatter={formatDate}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'DM Mono' }}
            axisLine={false} tickLine={false} interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'DM Mono' }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 8, fontSize: 12 }}
            labelFormatter={formatDate}
          />
          {dataKeys.map(dk => (
            <Area
              key={dk.key}
              type="monotone"
              dataKey={dk.key}
              name={dk.label}
              stroke={dk.color || color}
              fill={`url(#grad-${(dk.color || color).replace('#', '')})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PracticeItem({ title, description, active, color }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-surface/50">
      <div
        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
        style={{ backgroundColor: active ? color : '#374151' }}
      />
      <div>
        <p className="font-display font-medium text-sm text-text-primary">{title}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function EvolutionLayout({
  codename,
  title,
  subtitle,
  icon,
  color,
  metrics,
  trendDataKeys,
  trendTitle,
  practices,
  philosophy,
  domainId,
  streakFilter,
  children,
}) {
  const { history, today, loading, refetch } = usePillarData(30);

  if (loading) return <EvolutionSkeleton />;

  const currentMetrics = metrics ? metrics(today, history) : [];

  return (
    <div className="page-container fade-in">
      {/* Hero */}
      <div className="mb-6 sm:mb-8 pl-10 lg:pl-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl sm:text-3xl">{icon}</span>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest" style={{ color }}>
              {codename}
            </p>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-text-primary">{title}</h1>
          </div>
        </div>
        <p className="text-sm text-text-muted max-w-2xl mt-2">{subtitle}</p>
      </div>

      {/* Score Ring */}
      {currentMetrics.length > 0 && currentMetrics[0].value != null && (
        <div className="mb-6 px-5 py-4 rounded-xl border bg-surface flex items-center gap-5"
          style={{ borderColor: color + '30' }}>
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2"
            style={{ borderColor: color }}
          >
            <span className="font-display font-bold text-xl sm:text-2xl" style={{ color }}>
              {currentMetrics[0].value}
            </span>
          </div>
          <div>
            <p className="font-display font-semibold text-text-primary">{currentMetrics[0].label}</p>
            <p className="text-xs text-text-muted font-mono">Today's score</p>
          </div>
          <div className="flex-1 h-2 rounded-full bg-border overflow-hidden ml-4 hidden sm:block">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(currentMetrics[0].value, 100)}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}

      {/* Metric Cards */}
      {currentMetrics.length > 1 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {currentMetrics.slice(1).map((m, i) => (
            <MetricCard key={i} {...m} color={m.color || color} />
          ))}
        </div>
      )}

      {/* Domain Quick Check-In */}
      {domainId && (
        <div className="mb-6">
          <DomainCheckIn domain={domainId} color={color} onSaved={refetch} />
        </div>
      )}

      {/* Trend */}
      {history.length > 0 && trendDataKeys && (
        <div className="mb-6">
          <DomainTrend
            data={history}
            dataKeys={trendDataKeys}
            color={color}
            title={trendTitle || `${codename} — 30-Day Trend`}
          />
        </div>
      )}

      {/* Streaks + Comparison row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <StreakBar filter={streakFilter} />
        <ComparisonWidget />
      </div>

      {/* Goals */}
      {domainId && (
        <div className="mb-6">
          <GoalTracker domain={domainId} color={color} currentData={today} />
        </div>
      )}

      {/* Philosophy */}
      {philosophy && (
        <div className="mb-6 px-5 py-4 rounded-xl border border-border bg-surface/50">
          <p className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color }}>Philosophy</p>
          <p className="text-sm text-text-muted italic leading-relaxed">{philosophy}</p>
        </div>
      )}

      {/* Practices */}
      {practices && practices.length > 0 && (
        <div className="mb-6">
          <h3 className="font-display font-semibold text-sm text-text-primary mb-3">Core Practices</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {practices.map((p, i) => (
              <PracticeItem key={i} {...p} color={color} />
            ))}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
