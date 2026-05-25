import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DOMAIN_CONFIG = {
  financial: { label: 'Revenue',   color: '#FBBF24', target: 480 },  // 8h
  mental:    { label: 'Product',   color: '#60A5FA', target: 600 },  // 10h
  physical:  { label: 'Recovery',  color: '#22C55E', target: 300 },  // 5h
  spiritual: { label: 'Conviction',color: '#C084FC', target: 210 },  // 3.5h
  personal:  { label: 'Pipeline',  color: '#94A3B8', target: 300 },  // 5h
};

function DomainBar({ pillar, minutes }) {
  const cfg = DOMAIN_CONFIG[pillar] || { label: pillar, color: '#4A4A68', target: 300 };
  const pct = Math.min(100, Math.round((minutes / cfg.target) * 100));
  const hrs = Math.round(minutes / 6) / 10;
  const tgt = cfg.target / 60;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: '0.68rem', color: '#7A7A92', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace' }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: '0.68rem', color: pct >= 100 ? cfg.color : '#4A4A68', fontFamily: 'DM Mono, monospace' }}>
          {hrs}h / {tgt}h
        </span>
      </div>
      <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(37,37,64,0.8)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${cfg.color}80, ${cfg.color})`,
            borderRadius: '2px',
            transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
    </div>
  );
}

export default function OperatorOpsPanel() {
  const [dist, setDist] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/ops/metrics')
      .then(r => {
        setDist(r.data.pillar_distribution || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalMin = Object.values(dist).reduce((a, b) => a + (parseInt(b) || 0), 0);
  const totalHrs = Math.round(totalMin / 6) / 10;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(20,20,36,0.6)', border: '1px solid #252540' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p style={{ fontSize: '0.62rem', color: '#4A4A68', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
            This Week
          </p>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#C9C9C9', marginTop: '2px' }}>
            Execution Domains
          </p>
        </div>
        {totalMin > 0 && (
          <span style={{ fontSize: '0.7rem', color: '#5A5A72', fontFamily: 'DM Mono, monospace' }}>
            {totalHrs}h total
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'rgba(37,37,64,0.4)' }} />
          ))}
        </div>
      ) : totalMin === 0 ? (
        <p style={{ fontSize: '0.7rem', color: '#3A3A50', textAlign: 'center', padding: '16px 0' }}>
          Generate a day plan to track execution time
        </p>
      ) : (
        <div className="space-y-3">
          {['financial', 'mental', 'physical', 'spiritual', 'personal'].map(pillar => {
            const minutes = parseInt(dist[pillar]) || 0;
            if (minutes === 0 && pillar === 'personal') return null;
            return (
              <DomainBar
                key={pillar}
                pillar={pillar}
                minutes={minutes}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
