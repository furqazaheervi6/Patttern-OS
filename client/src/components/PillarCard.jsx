import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { pillarColor, pillarName } from '../utils/formatters.js';
import { scoreColor } from '../utils/scoring.js';

function AnimatedScore({ target }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (target == null) return;
    let start = null;
    const duration = 900;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  return <span>{display}</span>;
}

function AnimatedBar({ width, color }) {
  const [rendered, setRendered] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setRendered(width), 100);
    return () => clearTimeout(t);
  }, [width]);
  return (
    <div
      style={{
        height: '100%',
        width: `${rendered}%`,
        background: color,
        borderRadius: '2px',
        transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)',
      }}
    />
  );
}

const PILLAR_SYMBOLS = { physical: '◉', mental: '◈', financial: '◎', spiritual: '◯' };

function ClockSpinner({ color }) {
  return (
    <div style={{ position: 'relative', width: '48px', height: '48px', marginBottom: '14px' }}>
      <style>{`@keyframes clockHand { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(360deg); } }`}</style>
      {/* Clock face */}
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: `1.5px solid ${color}30`, position: 'relative' }}>
        {/* Hour ticks */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
          <div key={deg} style={{
            position: 'absolute', left: '50%', top: '3px',
            width: deg % 90 === 0 ? '2px' : '1px',
            height: deg % 90 === 0 ? '5px' : '3px',
            background: color + (deg % 90 === 0 ? '60' : '30'),
            transformOrigin: '50% calc(24px - 3px)',
            transform: `translateX(-50%) rotate(${deg}deg)`,
          }} />
        ))}
        {/* Minute hand */}
        <div style={{
          position: 'absolute', left: '50%', bottom: '50%',
          width: '1.5px', height: '14px',
          background: color, borderRadius: '1px',
          transformOrigin: '50% 100%',
          animation: 'clockHand 4s linear infinite',
        }} />
        {/* Hour hand (slower) */}
        <div style={{
          position: 'absolute', left: '50%', bottom: '50%',
          width: '2px', height: '9px',
          background: color + 'CC', borderRadius: '1px',
          transformOrigin: '50% 100%',
          animation: 'clockHand 48s linear infinite',
        }} />
        {/* Center dot */}
        <div style={{ position: 'absolute', width: '4px', height: '4px', borderRadius: '50%', background: color, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      </div>
    </div>
  );
}

export default function PillarCard({ pillar, score, prevScore, history = [], index = 0, hasData = true }) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const color = pillarColor(pillar);
  const name = pillarName(pillar);
  const symbol = PILLAR_SYMBOLS[pillar] || '◎';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(t);
  }, [index]);

  const delta = score != null && prevScore != null ? score - prevScore : null;
  const sparkData = history.slice(-7).map(d => ({ v: d[`${pillar}_score`] ?? 0 }));
  const scoreVal = score ?? 0;
  const showClock = !hasData || score === null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(28,28,46,0.92)',
        border: `1px solid ${hovered ? color + '40' : '#2E2E48'}`,
        borderRadius: '12px',
        padding: '18px',
        cursor: 'default',
        transition: 'all 0.3s ease',
        boxShadow: hovered
          ? `0 0 24px ${color}12, inset 0 1px 0 rgba(255,255,255,0.04)`
          : 'inset 0 1px 0 rgba(255,255,255,0.02)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '192px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      {/* Corner glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '60px',
          background: `radial-gradient(circle at top right, ${color}10, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color, fontSize: '0.85rem', opacity: 0.8 }}>{symbol}</span>
          <span
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '0.6rem',
              color: '#8A8A9A',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            {name}
          </span>
        </div>
        {delta != null && (
          <span
            style={{
              fontSize: '0.65rem',
              fontFamily: 'DM Mono, monospace',
              color: delta >= 0 ? '#22C55E' : '#F87171',
            }}
          >
            {delta >= 0 ? '↑' : '↓'}{Math.abs(Math.round(delta))}
          </span>
        )}
      </div>

      {/* Score or Clock */}
      {showClock ? (
        <ClockSpinner color={color} />
      ) : (
        <div
          style={{
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: '2.6rem',
            fontWeight: 700,
            lineHeight: 1,
            marginBottom: '14px',
            color: scoreColor(scoreVal),
            letterSpacing: '-0.02em',
          }}
        >
          <AnimatedScore target={scoreVal} />
        </div>
      )}

      {/* Sparkline */}
      {sparkData.length > 1 && (
        <div style={{ height: '34px', margin: '0 -4px 10px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                strokeOpacity={hovered ? 0.9 : 0.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
        <div style={{ flex: 1, height: '2px', borderRadius: '2px', background: '#2A2A42', overflow: 'hidden' }}>
          {!showClock && <AnimatedBar width={Math.min(scoreVal, 100)} color={color} />}
        </div>
        <span style={{ fontSize: '0.6rem', color: showClock ? color + '40' : '#3A3A50', fontFamily: 'DM Mono, monospace' }}>
          {showClock ? '—' : '/100'}
        </span>
      </div>
    </div>
  );
}
