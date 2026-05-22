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

export default function Digest() {
  const { digest: latest, generating, generate } = useWeeklyDigest();
  const [allDigests, setAllDigests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await axios.get('/api/digest');
        setAllDigests(res.data);
        if (res.data.length > 0) setSelected(res.data[0]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleGenerate = async () => {
    const result = await generate();
    const res = await axios.get('/api/digest');
    setAllDigests(res.data);
    if (res.data.length > 0) setSelected(res.data[0]);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-xl text-text-primary">Weekly Digests</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary"
        >
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
          {/* Digest list */}
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
                  {d.week_start} →
                </p>
                <p className="text-xs font-mono text-text-muted mt-0.5">{d.week_end}</p>
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

          {/* Selected digest */}
          <div className="lg:col-span-3 card">
            {selected ? (
              <>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="font-display font-bold text-text-primary">
                      Week of {selected.week_start}
                    </h2>
                    <p className="text-xs text-text-muted mt-1 font-mono">
                      Generated {formatRelativeTime(selected.generated_at)} · Powered by Claude
                    </p>
                  </div>
                  <div className="flex gap-2">
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
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                Select a digest from the list
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
