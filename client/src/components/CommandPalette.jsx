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
  { id: 'checkin',  icon: '◎', label: 'Log Check-In',         action: 'checkin' },
  { id: 'plan',     icon: '▶', label: 'Generate Day Plan',    path: '/calendar', highlight: 'plan' },
  { id: 'init',     icon: '◈', label: 'New Initiative',       path: '/initiatives', highlight: 'add' },
  { id: 'pattern',  icon: '⬟', label: 'Launch a Pattern',    path: '/patterns' },
];

export default function CommandPalette({ onCheckinOpen }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const allCommands = [...ACTION_COMMANDS, ...NAV_COMMANDS];
  const filtered = query.trim()
    ? allCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : allCommands;

  const execute = useCallback((cmd) => {
    setOpen(false);
    setQuery('');
    if (cmd.action === 'checkin') {
      onCheckinOpen?.();
    } else if (cmd.path) {
      navigate(cmd.path);
    }
  }, [navigate, onCheckinOpen]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(s => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(s => Math.max(s - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selected]) execute(filtered[selected]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selected, execute]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selected];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(8,8,18,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden slide-up"
        style={{ background: '#10101E', border: '1px solid #2E2E48', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid #252540' }}
        >
          <span style={{ color: '#4A4A68', fontSize: '0.85rem' }}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Jump to page or action..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          />
          <kbd
            style={{
              fontSize: '0.6rem', color: '#4A4A68', background: '#1C1C2E',
              border: '1px solid #2E2E48', borderRadius: '4px', padding: '2px 6px',
              fontFamily: 'DM Mono, monospace',
            }}
          >ESC</kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="overflow-y-auto"
          style={{ maxHeight: '320px' }}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center" style={{ fontSize: '0.75rem', color: '#4A4A68' }}>
              No results for "{query}"
            </div>
          ) : (
            <>
              {!query && (
                <div className="px-4 pt-3 pb-1" style={{ fontSize: '0.6rem', color: '#3A3A50', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
                  Quick Actions
                </div>
              )}
              {filtered.slice(0, !query ? ACTION_COMMANDS.length : undefined).map((cmd, i) => (
                <CommandItem
                  key={cmd.id}
                  cmd={cmd}
                  active={i === selected}
                  onSelect={() => execute(cmd)}
                  onHover={() => setSelected(i)}
                />
              ))}
              {!query && (
                <div className="px-4 pt-3 pb-1" style={{ fontSize: '0.6rem', color: '#3A3A50', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
                  Navigate
                </div>
              )}
              {(query ? filtered : NAV_COMMANDS).map((cmd, i) => {
                const idx = query ? i : ACTION_COMMANDS.length + i;
                return (
                  <CommandItem
                    key={cmd.id}
                    cmd={cmd}
                    active={idx === selected}
                    onSelect={() => execute(cmd)}
                    onHover={() => setSelected(idx)}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2.5 flex items-center gap-4"
          style={{ borderTop: '1px solid #1C1C2E' }}
        >
          {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5" style={{ fontSize: '0.6rem', color: '#3A3A50' }}>
              <kbd style={{ background: '#1C1C2E', border: '1px solid #252540', borderRadius: '3px', padding: '1px 5px', fontFamily: 'DM Mono, monospace', color: '#4A4A68' }}>
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommandItem({ cmd, active, onSelect, onHover }) {
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
      style={{
        background: active ? 'rgba(139,0,0,0.08)' : 'transparent',
        borderLeft: active ? '2px solid #8B0000' : '2px solid transparent',
      }}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center', color: active ? '#C9C9C9' : '#4A4A68', flexShrink: 0 }}>
        {cmd.icon}
      </span>
      <span style={{ fontSize: '0.78rem', color: active ? '#C9C9C9' : '#6B6B84', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {cmd.label}
      </span>
      {active && (
        <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#4A4A68', fontFamily: 'DM Mono, monospace' }}>↵</span>
      )}
    </button>
  );
}
