import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDate, formatRelativeTime } from '../utils/formatters.js';

export default function NotionFeed() {
  const [feed, setFeed] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

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
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await axios.get('/api/notion/sync');
      await fetchFeed();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-sm text-text-primary">Notion Journal</h3>
          {lastSync && (
            <p className="text-xs text-text-muted mt-0.5">
              Synced {formatRelativeTime(lastSync)}
            </p>
          )}
        </div>
        {configured && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs text-text-muted hover:text-mental transition-colors"
          >
            {syncing ? '⟳' : '↺'} Sync
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-text-muted text-xs">
          <span className="animate-spin mr-2">⟳</span> Loading...
        </div>
      ) : !configured ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <p className="text-text-muted text-xs">Notion not configured.</p>
          <a
            href="/settings"
            className="text-xs text-mental mt-1 hover:underline"
          >
            Add API key in Settings →
          </a>
        </div>
      ) : feed.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-text-muted text-xs">No journal entries cached yet.</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '220px' }}>
          {feed.map((page) => {
            const rc = page.raw_content;
            const title = rc?.title || 'Untitled';
            return (
              <div
                key={page.page_id}
                className="px-3 py-2 rounded-lg border border-border bg-bg/50 hover:border-border/80 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-mono text-text-primary truncate flex-1">
                    📅 {title}
                  </p>
                  {page.page_date && (
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {formatDate(page.page_date)}
                    </span>
                  )}
                </div>
                {page.parsed_fields && (
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {Object.entries(page.parsed_fields)
                      .filter(([, v]) => v?.notes)
                      .slice(0, 1)
                      .map(([k, v]) => (
                        <p key={k} className="text-xs text-text-muted truncate">
                          {v.notes}
                        </p>
                      ))}
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
