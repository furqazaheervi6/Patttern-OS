import React from 'react';

function Pulse({ className = '', style = {} }) {
  return (
    <div
      className={`rounded bg-border animate-pulse ${className}`}
      style={style}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <Pulse className="w-6 h-6 rounded-full" />
        <Pulse className="h-4 w-20" />
      </div>
      <Pulse className="h-10 w-16" />
      <Pulse className="h-10 w-full" />
      <Pulse className="h-1 w-full" />
    </div>
  );
}

export function ChartSkeleton({ height = 220 }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <Pulse className="h-4 w-32" />
        <div className="flex gap-2">
          <Pulse className="h-5 w-14" />
          <Pulse className="h-5 w-14" />
          <Pulse className="h-5 w-14" />
        </div>
      </div>
      <Pulse style={{ height }} className="w-full" />
    </div>
  );
}

export function ScoreSkeleton() {
  return (
    <div className="px-5 py-3 rounded-xl border border-border bg-surface flex items-center gap-4">
      <Pulse className="w-12 h-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Pulse className="h-3 w-24" />
        <Pulse className="h-2 w-full" />
      </div>
    </div>
  );
}

export function EvolutionSkeleton() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Pulse className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-6 w-48" />
        </div>
      </div>
      <Pulse className="h-4 w-96" />
      <ScoreSkeleton />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
      <ChartSkeleton />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Pulse className="h-6 w-32" />
          <Pulse className="h-3 w-48" />
        </div>
        <Pulse className="h-10 w-28 rounded-lg" />
      </div>
      <ScoreSkeleton />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><ChartSkeleton /></div>
        <ChartSkeleton height={200} />
      </div>
    </div>
  );
}
