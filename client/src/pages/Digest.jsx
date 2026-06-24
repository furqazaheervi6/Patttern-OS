import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWeeklyDigest } from '../hooks/useWeeklyDigest.js';
import { formatRelativeTime, pillarColor, pillarName } from '../utils/formatters.js';

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, (m) => (m.trim() ? `<p>${m}</p>` : ''));
}

function NotionEntries({ weekStart, weekEnd }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!weekStart || !weekEnd) return;
    setLoading(true);
    axios.get('/api/notion/entries', { params: { start: weekStart, end: weekEnd } })
      .then(r => setEntries(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [weekStart, weekEnd]);

  if (loading) return (
    <div style={{ padding: '12px 0', fontSize: '0.65rem', color: '#3A3A55', fontFamily: 'DM Mono, monospace' }}>
      Loading journal entries…
    </div>
  );

  if (entries.length === 0) return (
    <div style={{ padding: '12px 0', fontSize: '0.65rem', color: '#3A3A55', fontFamily: 'DM Mono, monospace' }}>
      No Notion entries found for this week.
    </div>
  );

  // Sort chronologically (oldest first)
  const sorted = [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {sorted.map((entry, i) => (
        <a
          key={i}
          href={entry.url || '#'}
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px', borderRadius: '8px',
            background: 'rgba(139,0,0,0.05)', border: '1px solid rgba(139,0,0,0.15)',
            transition: 'background 0.12s ease', cursor: entry.url ? 'pointer' : 'default',
          }}
            onMouseEnter={e => entry.url && (e.currentTarget.style.background = 'rgba(139,0,0,0.1)')}
            onMouseLeave={e => entry.url && (e.currentTarget.style.background = 'rgba(139,0,0,0.05)')}
          >
            <span style={{ fontSize: '0.5rem', color: '#8B0000', flexShrink: 0 }}>◎</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.68rem', color: '#C9C9C9', fontWeight: 500, lineHeight: 1.3, marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.title}
              </p>
              <p style={{ fontSize: '0.56rem', color: '#4A4A68', fontFamily: 'DM Mono, monospace' }}>{entry.date}</p>
            </div>
            {entry.url && <span style={{ fontSize: '0.56rem', color: '#8B0000', flexShrink: 0 }}>↗</span>}
          </div>
        </a>
      ))}
    </div>
  );
}

export default function Digest() {
  const { digest: latest, generating, generate } = useWeeklyDigest();
  const [allDigests, setAllDigests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const res = await axios.get('/api/digest');
      const data = Array.isArray(res.data) ? res.data : [];
      // Sort chronologically — newest first for archive list
      const sorted = [...data].sort((a, b) => (b.week_start || '').localeCompare(a.week_start || ''));
      setAllDigests(sorted);
      if (sorted.length > 0) setSelected(sorted[0]);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleGenerate = async () => {
    await generate();
    await fetchAll();
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-bold text-xl text-text-primary">Weekly Digests</h1>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary">
          {generating ? '⟳ Generating...' : '✦ Generate Digest'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-text-muted text-sm">
          <span className="animate-spin mr-2">⟳</span> Loading...
        </div>
      ) : allDigests.length === 0 ? (
        <div className="card text-center py-20">
          <p className="text-5xl mb-4">✦</p>
          <h2 className="font-display font-bold text-text-primary mb-2">No digests yet</h2>
          <p className="text-text-muted text-sm mb-6">
            Complete at least a few check-ins, then generate your first weekly digest.
          </p>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary">
            {generating ? 'Generating...' : 'Generate First Digest'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Digest archive list */}
          <div className="lg:col-span-1 space-y-2">
            <p className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider mb-3">
              Archive
            </p>
            {allDigests.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`w-full text-left px-3 py-3 rounded-lg border transition-colors ${
                  selected?.id === d.id
                    ? 'border-mental/40 bg-mental/10'
                    : 'border-border hover:border-border/80'
                }`}
              >
                <p className="text-xs font-display font-semibold text-text-primary">
                  {d.week_start}
                </p>
                <p className="text-xs font-mono text-text-muted mt-0.5">→ {d.week_end}</p>
                {d.weakest_pillar && (
                  <div className="mt-2 flex gap-2">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-mono"
                      style={{
                        color: pillarColor(d.weakest_pillar),
                        background: pillarColor(d.weakest_pillar) + '15',
                        border: `1px solid ${pillarColor(d.weakest_pillar)}30`,
                      }}
                    >
                      ↓ {pillarName(d.weakest_pillar)}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Selected digest + Notion entries */}
          <div className="lg:col-span-3 space-y-4">
            {selected ? (
              <>
                {/* Main digest card */}
                <div className="card">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h2 className="font-display font-bold text-text-primary">
                        Week of {selected.week_start}
                      </h2>
                      <p className="text-xs text-text-muted mt-1 font-mono">
                        {selected.week_start} → {selected.week_end} · Generated {formatRelativeTime(selected.generated_at)} · Powered by Claude
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {selected.strongest_pillar && (
                        <span
                          className="text-xs px-2 py-1 rounded-lg font-mono"
                          style={{
                            color: pillarColor(selected.strongest_pillar),
                            background: pillarColor(selected.strongest_pillar) + '15',
                            border: `1px solid ${pillarColor(selected.strongest_pillar)}30`,
                          }}
                        >
                          ↑ {pillarName(selected.strongest_pillar)}
                        </span>
                      )}
                      {selected.weakest_pillar && (
                        <span
                          className="text-xs px-2 py-1 rounded-lg font-mono"
                          style={{
                            color: pillarColor(selected.weakest_pillar),
                            background: pillarColor(selected.weakest_pillar) + '15',
                            border: `1px solid ${pillarColor(selected.weakest_pillar)}30`,
                          }}
                        >
                          ↓ {pillarName(selected.weakest_pillar)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="digest-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.content) }}
                  />
                </div>

                {/* Notion journal entries from this week */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ color: '#8B0000', fontSize: '0.75rem' }}>◎</span>
                    <h3 className="font-display font-semibold text-sm text-text-primary">
                      Notion Journal — This Week
                    </h3>
                    <span className="text-xs font-mono text-text-muted ml-auto">
                      {selected.week_start} → {selected.week_end}
                    </span>
                  </div>
                  <NotionEntries weekStart={selected.week_start} weekEnd={selected.week_end} />
                </div>
              </>
            ) : (
              <div className="card flex items-center justify-center h-64 text-text-muted text-sm">
                Select a digest from the list
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
