import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { formatDate, formatRelativeTime } from '../utils/formatters.js';

const PILLAR_COLORS = {
  physical: '#22C55E',
  mental: '#60A5FA',
  financial: '#FBBF24',
  spiritual: '#C084FC',
};

const PILLAR_SYMBOLS = {
  physical: '◉',
  mental: '◈',
  financial: '◎',
  spiritual: '◯',
};

function PillarChip({ pillar, notes }) {
  if (!notes) return null;
  return (
    <div
      className="flex items-start gap-1.5 mt-1.5"
      style={{ borderLeft: `2px solid ${PILLAR_COLORS[pillar]}30`, paddingLeft: '8px' }}
    >
      <span style={{ color: PILLAR_COLORS[pillar], fontSize: '0.65rem', flexShrink: 0, marginTop: '1px' }}>
        {PILLAR_SYMBOLS[pillar]}
      </span>
      <p style={{ fontSize: '0.68rem', color: '#6A6A82', lineHeight: 1.5, margin: 0 }}>
        {notes}
      </p>
    </div>
  );
}

export default function NotionFeed() {
  const [feed, setFeed] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const eventSourceRef = useRef(null);

  const fetchFeed = async () => {
    try {
      const [feedRes, statusRes] = await Promise.all([
        axios.get('/api/notion/feed'),
        axios.get('/api/notion/status'),
      ]);
      setFeed(feedRes.data.pages || []);
      setLastSync(feedRes.data.last_sync);
      setConfigured(statusRes.data.configured);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchFeed();
    // Refresh feed every 90 seconds
    const interval = setInterval(fetchFeed, 90 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFullSync = () => {
    if (syncing) return;
    setSyncing(true);
    setSyncLog('Starting...');

    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource('/api/notion/sync-full');
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.msg === 'progress') {
          setSyncLog(data.text || '');
        } else if (data.msg === 'done') {
          setSyncLog(`Done — ${data.enriched || 0} enriched, ${data.mapped || 0} mapped`);
          setSyncing(false);
          es.close();
          fetchFeed();
        } else if (data.msg === 'error') {
          setSyncLog(`Error: ${data.text}`);
          setSyncing(false);
          es.close();
        }
      } catch {}
    };

    es.onerror = () => {
      setSyncLog('Connection error');
      setSyncing(false);
      es.close();
      fetchFeed();
    };
  };

  const PILLARS = ['physical', 'mental', 'financial', 'spiritual'];

  return (
    <div className="card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '0.7rem',
              color: '#C9C9C9',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '2px',
            }}
          >
            Notion Journal
          </h3>
          {lastSync && (
            <p style={{ fontSize: '0.6rem', color: '#3A3A50', fontFamily: 'DM Mono, monospace' }}>
              Synced {formatRelativeTime(lastSync)}
            </p>
          )}
        </div>

        {configured && (
          <button
            onClick={handleFullSync}
            disabled={syncing}
            className="flex items-center gap-1.5 transition-all"
            style={{
              fontSize: '0.65rem',
              color: syncing ? '#8B0000' : '#5A5A72',
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '0.08em',
              padding: '4px 8px',
              border: '1px solid',
              borderColor: syncing ? 'rgba(139,0,0,0.3)' : '#1A1A2A',
              borderRadius: '6px',
              background: syncing ? 'rgba(139,0,0,0.06)' : 'transparent',
            }}
          >
            <span className={syncing ? 'animate-spin inline-block' : ''}>↺</span>
            {syncing ? 'Syncing' : 'Deep Sync'}
          </button>
        )}
      </div>

      {/* Sync progress */}
      {syncLog && (
        <div
          className="mb-3 px-3 py-2 rounded-lg"
          style={{
            background: 'rgba(139,0,0,0.05)',
            border: '1px solid rgba(139,0,0,0.15)',
            fontSize: '0.6rem',
            color: '#8B0000',
            fontFamily: 'DM Mono, monospace',
            letterSpacing: '0.04em',
          }}
        >
          {syncLog}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center flex-1 py-8">
          <span
            className="animate-spin mr-2"
            style={{ color: '#3A3A50', fontSize: '0.75rem' }}
          >
            ⟳
          </span>
          <span style={{ fontSize: '0.65rem', color: '#3A3A50' }}>Loading...</span>
        </div>
      ) : !configured ? (
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
          <p style={{ fontSize: '0.7rem', color: '#5A5A72' }}>Notion not configured.</p>
          <a href="/settings" style={{ fontSize: '0.65rem', color: '#8B0000', marginTop: '6px' }}>
            Add API key in Settings →
          </a>
        </div>
      ) : feed.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-8">
          <p style={{ fontSize: '0.7rem', color: '#5A5A72' }}>No journal entries synced yet.</p>
          <button
            onClick={handleFullSync}
            style={{ fontSize: '0.65rem', color: '#8B0000', marginTop: '6px' }}
          >
            Run deep sync →
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2" style={{ maxHeight: '280px' }}>
          {feed.map((page) => {
            const rc = page.raw_content || {};
            const pf = page.parsed_fields || {};
            const title = rc?.title || 'Untitled';
            const isExpanded = expandedId === page.page_id;
            const hasPillarData = PILLARS.some(p => pf?.[p]?.notes);
            const hasSummary = pf?.summary;

            return (
              <div
                key={page.page_id}
                className="rounded-lg transition-all cursor-pointer"
                style={{
                  border: '1px solid',
                  borderColor: isExpanded ? 'rgba(139,0,0,0.25)' : '#1A1A2A',
                  background: isExpanded ? 'rgba(139,0,0,0.04)' : 'transparent',
                  padding: '10px 12px',
                }}
                onClick={() => setExpandedId(isExpanded ? null : page.page_id)}
              >
                {/* Row */}
                <div className="flex items-center justify-between gap-2">
                  <p
                    style={{
                      fontSize: '0.7rem',
                      color: '#C9C9C9',
                      fontFamily: 'DM Mono, monospace',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {title}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Pillar indicators */}
                    <div className="flex gap-0.5">
                      {PILLARS.map(p => (
                        <span
                          key={p}
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: pf?.[p]?.notes ? PILLAR_COLORS[p] : '#1A1A2A',
                          }}
                        />
                      ))}
                    </div>
                    {page.page_date && (
                      <span
                        style={{
                          fontSize: '0.6rem',
                          color: '#3A3A50',
                          fontFamily: 'DM Mono, monospace',
                        }}
                      >
                        {formatDate(page.page_date)}
                      </span>
                    )}
                    <span style={{ fontSize: '0.6rem', color: '#3A3A50' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 space-y-1">
                    {hasSummary && (
                      <p
                        style={{
                          fontSize: '0.7rem',
                          color: '#8A8A9A',
                          fontStyle: 'italic',
                          lineHeight: 1.5,
                          marginBottom: '8px',
                          paddingBottom: '8px',
                          borderBottom: '1px solid #1A1A2A',
                        }}
                      >
                        "{pf.summary}"
                      </p>
                    )}

                    {hasPillarData ? (
                      PILLARS.map(p =>
                        pf?.[p]?.notes ? (
                          <PillarChip key={p} pillar={p} notes={pf[p].notes} />
                        ) : null
                      )
                    ) : rc?.full_text ? (
                      <p
                        style={{
                          fontSize: '0.65rem',
                          color: '#5A5A72',
                          lineHeight: 1.6,
                          fontFamily: 'DM Mono, monospace',
                        }}
                      >
                        {rc.full_text.slice(0, 300)}
                        {rc.full_text.length > 300 ? '...' : ''}
                      </p>
                    ) : (
                      <p style={{ fontSize: '0.65rem', color: '#3A3A50', fontStyle: 'italic' }}>
                        No signals extracted yet — run Deep Sync to analyze this entry.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
