import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { pillarColor, pillarIcon, pillarName } from '../utils/formatters.js';
import { scoreClass, scoreColor } from '../utils/scoring.js';

function AnimatedScore({ target }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (target == null) return;
    let start = null;
    const duration = 800;
    const from = 0;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  return <span>{display}</span>;
}

export default function PillarCard({ pillar, score, prevScore, history = [], index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const color = pillarColor(pillar);
  const icon = pillarIcon(pillar);
  const name = pillarName(pillar);

  const delta = score != null && prevScore != null ? score - prevScore : null;
  const sparkData = history.slice(-7).map((d) => ({
    v: d[`${pillar}_score`] ?? 0,
  }));

  return (
    <div
      className="card cursor-default transition-all duration-200 fade-in"
      style={{
        animationDelay: `${index * 80}ms`,
        borderColor: hovered ? color + '40' : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-display font-semibold text-sm text-text-primary">{name}</span>
        </div>
        {delta != null && (
          <span
            className="text-xs font-mono"
            style={{ color: delta >= 0 ? '#22C55E' : '#F87171' }}
          >
            {delta >= 0 ? '↑' : '↓'} {Math.abs(Math.round(delta))}
          </span>
        )}
      </div>

      {/* Score */}
      <div
        className="font-display font-bold text-4xl mb-3"
        style={{ color: scoreColor(score ?? 0) }}
      >
        <AnimatedScore target={score ?? 0} />
      </div>

      {/* Sparkline */}
      {sparkData.length > 1 && (
        <div className="h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                strokeOpacity={0.8}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Score label */}
      <div className="mt-2 flex items-center justify-between">
        <div className="h-1 flex-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(score ?? 0, 100)}%`, backgroundColor: color }}
          />
        </div>
        <span className="ml-2 text-xs text-text-muted font-mono">/100</span>
      </div>
    </div>
  );
}
