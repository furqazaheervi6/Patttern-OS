import React from 'react';
import { pillarName } from '../utils/formatters.js';

const severityConfig = {
  info: { bg: 'bg-blue-900/20', border: 'border-blue-800/40', dot: '#60A5FA', icon: '◉' },
  warning: { bg: 'bg-amber-900/20', border: 'border-amber-800/40', dot: '#FBBF24', icon: '⚠' },
  insight: { bg: 'bg-purple-900/20', border: 'border-purple-800/40', dot: '#C084FC', icon: '✦' },
};

export default function PatternAlert({ alerts = [], onDismiss }) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
        Pattern Alerts
      </p>
      <div className="flex flex-wrap gap-2">
        {alerts.map((alert) => {
          const cfg = severityConfig[alert.severity] || severityConfig.info;
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${cfg.bg} ${cfg.border} fade-in max-w-lg`}
            >
              <span className="text-sm mt-0.5" style={{ color: cfg.dot }}>
                {cfg.icon}
              </span>
              <div className="flex-1 min-w-0">
                {(alert.pillar_a || alert.pillar_b) && (
                  <div className="flex gap-1 mb-0.5">
                    {alert.pillar_a && (
                      <span className="text-xs font-mono" style={{ color: cfg.dot }}>
                        {pillarName(alert.pillar_a)}
                      </span>
                    )}
                    {alert.pillar_b && (
                      <>
                        <span className="text-xs text-text-muted">×</span>
                        <span className="text-xs font-mono" style={{ color: cfg.dot }}>
                          {pillarName(alert.pillar_b)}
                        </span>
                      </>
                    )}
                  </div>
                )}
                <p className="text-xs text-text-muted leading-relaxed">{alert.description}</p>
              </div>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="text-text-muted hover:text-text-primary text-xs ml-1 flex-shrink-0"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
