import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const NAV_COMMANDS = [
  { id: 'home',        icon: '⬡', label: 'Go to Dashboard',    path: '/' },
  { id: 'calendar',   icon: '◷', label: 'Go to Calendar',     path: '/calendar' },
  { id: 'initiatives',icon: '◈', label: 'Go to Initiatives',  path: '/initiatives' },
  { id: 'patterns',   icon: '⬟', label: 'Go to Patterns',     path: '/patterns' },
  { id: 'history',    icon: '≡', label: 'Go to History',      path: '/history' },
  { id: 'digest',     icon: '✦', label: 'Go to Digests',      path: '/digest' },
  { id: 'ops',        icon: '⊹', label: 'Go to Ops Dashboard', path: '/ops' },
  { id: 'settings',   icon: '⚙', label: 'Go to Settings',     path: '/settings' },
];

const ACTION_COMMANDS = [
  { id: 'checkin',  icon: '◎', label: 'Log Check-In',         path: '/?checkin=1' },
  { id: 'plan',     icon: '▶', label: 'Generate Day Plan',    path: '/calendar' },
  { id: 'init',     icon: '◈', label: 'New Initiative',       path: '/initiatives' },
  { id: 'pattern',  icon: '⬟', label: 'Launch a Pattern',    path: '/patterns' },
];

const ALL = [...ACTION_COMMANDS, ...NAV_COMMANDS];

export default function CommandPalette() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [selected, setSelected] = useState(0);
  const navigate              = useNavigate();
  const inputRef              = useRef(null);
  const listRef               = useRef(null);
  const wrapRef               = useRef(null);
  const closeTimer            = useRef(null);

  const openPalette = useCallback(() => {
    clearTimeout(closeTimer.current);
    setOpen(true);
    setQuery('');
    setSelected(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open ? closePalette() : openPalette(); }
      if (e.key === 'Escape') closePalette();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, openPalette, closePalette]);

  // Auto-reveal when cursor moves into top 56px zone
  useEffect(() => {
    const handler = (e) => {
      if (e.clientY < 56) {
        clearTimeout(closeTimer.current);
        setOpen(true);
      }
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // Close when cursor leaves the palette area (with small grace period)
  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 300);
  };
  const handleMouseEnter = () => {
    clearTimeout(closeTimer.current);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) closePalette();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, closePalette]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const filtered = query.trim()
    ? ALL.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : ALL;

  const execute = useCallback((cmd) => {
    closePalette();
    if (cmd.path) navigate(cmd.path);
  }, [navigate, closePalette]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (filtered[selected]) execute(filtered[selected]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selected, execute]);

  useEffect(() => {
    listRef.current?.children[selected]?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <div
      ref={wrapRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'fixed', top: 0, right: 0, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}
    >
      {/* Trigger pill — always visible */}
      <button
        onClick={() => open ? closePalette() : openPalette()}
        style={{
          margin: '10px 14px 0 0',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px 5px 10px',
          borderRadius: 20,
          background: open ? 'rgba(139,0,0,0.15)' : 'rgba(20,20,36,0.8)',
          border: `1px solid ${open ? 'rgba(139,0,0,0.4)' : 'rgba(46,46,72,0.8)'}`,
          backdropFilter: 'blur(12px)',
          color: open ? '#C9C9C9' : '#5A5A72',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '0.7rem',
          fontFamily: 'DM Mono, monospace',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>⌘</span>
        <span>Search &amp; Jump</span>
        <kbd style={{
          fontSize: '0.55rem', color: '#3A3A50',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid #252540', borderRadius: 3,
          padding: '1px 4px', fontFamily: 'DM Mono, monospace',
        }}>K</kbd>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            marginTop: 6,
            marginRight: 14,
            width: 380,
            borderRadius: 14,
            overflow: 'hidden',
            background: '#0E0E1C',
            border: '1px solid #2E2E48',
            boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,0,0,0.08)',
            animation: 'slideDownFade 0.15s ease',
          }}
        >
          {/* Search input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #1E1E32' }}>
            <span style={{ color: '#4A4A68', fontSize: '0.8rem', flexShrink: 0 }}>⌕</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
              placeholder="Jump to page or action..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#C9C9C9', fontSize: '0.82rem',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />
            {query && (
              <button onClick={() => { setQuery(''); setSelected(0); inputRef.current?.focus(); }}
                style={{ color: '#4A4A68', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>
                ×
              </button>
            )}
          </div>

          {/* Results */}
          <div ref={listRef} style={{ maxHeight: 300, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: '0.72rem', color: '#3A3A50' }}>
                No results for "{query}"
              </div>
            ) : (
              <>
                {!query && <SectionLabel>Quick Actions</SectionLabel>}
                {(query ? filtered : ACTION_COMMANDS).map((cmd, i) => (
                  <CommandItem key={cmd.id} cmd={cmd} active={i === selected}
                    onSelect={() => execute(cmd)} onHover={() => setSelected(i)} />
                ))}
                {!query && <SectionLabel>Navigate</SectionLabel>}
                {!query && NAV_COMMANDS.map((cmd, i) => {
                  const idx = ACTION_COMMANDS.length + i;
                  return <CommandItem key={cmd.id} cmd={cmd} active={idx === selected}
                    onSelect={() => execute(cmd)} onHover={() => setSelected(idx)} />;
                })}
              </>
            )}
          </div>

          {/* Footer hints */}
          <div style={{ padding: '6px 14px', borderTop: '1px solid #1A1A2A', display: 'flex', gap: 16 }}>
            {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([k, l]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.58rem', color: '#3A3A50' }}>
                <kbd style={{ background: '#1A1A2A', border: '1px solid #252540', borderRadius: 3, padding: '1px 4px', fontFamily: 'DM Mono, monospace', color: '#4A4A68' }}>{k}</kbd>
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ padding: '8px 14px 4px', fontSize: '0.58rem', color: '#3A3A50', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
      {children}
    </div>
  );
}

function CommandItem({ cmd, active, onSelect, onHover }) {
  return (
    <button
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', textAlign: 'left', cursor: 'pointer',
        background: active ? 'rgba(139,0,0,0.09)' : 'transparent',
        borderLeft: `2px solid ${active ? '#8B0000' : 'transparent'}`,
        border: 'none', transition: 'background 0.1s',
      }}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <span style={{ fontSize: '0.85rem', width: 18, textAlign: 'center', color: active ? '#C9C9C9' : '#4A4A68', flexShrink: 0 }}>
        {cmd.icon}
      </span>
      <span style={{ fontSize: '0.76rem', color: active ? '#C9C9C9' : '#6B6B84', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {cmd.label}
      </span>
      {active && <span style={{ marginLeft: 'auto', fontSize: '0.58rem', color: '#4A4A68', fontFamily: 'DM Mono, monospace' }}>↵</span>}
    </button>
  );
}
