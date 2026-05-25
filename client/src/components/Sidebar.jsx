import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import axios from 'axios';
import { formatRelativeTime } from '../utils/formatters.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const navItems = [
  { path: '/',            icon: '⬡', label: 'Dashboard' },
  { path: '/calendar',   icon: '◷', label: 'Calendar' },
  { path: '/initiatives',icon: '◈', label: 'Initiatives' },
  { path: '/history',    icon: '≡', label: 'History' },
  { path: '/digest',     icon: '✦', label: 'Digests' },
  { path: '/ops',        icon: '⊹', label: 'Ops' },
  { path: '/settings',   icon: '⚙', label: 'Settings' },
];

const evolutions = [
  { path: '/evolution/construction', icon: '∎', label: 'Construction', color: '#22C55E' },
  { path: '/evolution/sojourney', icon: '◉', label: 'Sojourney', color: '#F472B6' },
  { path: '/evolution/kaizen', icon: '△', label: 'Kaizen', color: '#60A5FA' },
  { path: '/evolution/harmony', icon: '◯', label: 'Harmony', color: '#C084FC' },
  { path: '/evolution/omnivision', icon: '◎', label: 'Omnivision', color: '#06B6D4' },
  { path: '/evolution/200', icon: '∞', label: '200%', color: '#FBBF24' },
  { path: '/evolution/humanity', icon: '⌘', label: 'Humanity', color: '#F97316' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [notionSync, setNotionSync] = useState(null);
  const [googleStatus, setGoogleStatus] = useState(null);
  const [hasDigest, setHasDigest] = useState(false);
  const [evoOpen, setEvoOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isEvoActive = location.pathname.startsWith('/evolution');

  useEffect(() => {
    if (isEvoActive) setEvoOpen(true);
  }, [isEvoActive]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const [integrations, setIntegrations] = useState({});

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [ns, gs, ds, integ] = await Promise.all([
          axios.get('/api/notion/status'),
          axios.get('/api/google/status'),
          axios.get('/api/digest/latest'),
          axios.get('/api/integrations').catch(() => ({ data: [] })),
        ]);
        setNotionSync(ns.data);
        setGoogleStatus(gs.data);
        setHasDigest(!!ds.data);
        const integMap = {};
        for (const i of integ.data) integMap[i.name] = i;
        setIntegrations(integMap);
      } catch {}
    };
    fetchStatus();
  }, []);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-6" style={{ borderBottom: '1px solid #252540' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span style={{ color: '#8B0000', fontSize: '1.25rem', lineHeight: 1 }}>◎</span>
            <span
              style={{
                fontFamily: 'Cinzel, Georgia, serif',
                fontWeight: 700,
                fontSize: '0.95rem',
                color: '#C9C9C9',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              PatternOS
            </span>
          </div>
          <button
            className="lg:hidden text-text-muted hover:text-text-primary text-xl w-8 h-8 flex items-center justify-center"
            onClick={() => setMobileOpen(false)}
          >
            ×
          </button>
        </div>
        <p
          style={{
            fontSize: '0.65rem',
            color: '#4A4A68',
            marginTop: '4px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontFamily: 'DM Mono, monospace',
          }}
        >
          Whole-self intelligence
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive ? 'active-nav' : ''
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? '#C9C9C9' : '#5A5A72',
              background: isActive ? 'rgba(139,0,0,0.12)' : 'transparent',
              borderLeft: isActive ? '2px solid #8B0000' : '2px solid transparent',
              letterSpacing: '0.06em',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              fontFamily: 'Inter, system-ui, sans-serif',
            })}
          >
            <span style={{ fontSize: '0.9rem', width: '18px', textAlign: 'center', opacity: 0.8 }}>
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}

        {/* Evolutions */}
        <div style={{ paddingTop: '16px', marginTop: '16px', borderTop: '1px solid #252540' }}>
          <button
            onClick={() => setEvoOpen(!evoOpen)}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-200"
            style={{
              color: isEvoActive ? '#C9C9C9' : '#5A5A72',
              fontSize: '0.75rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '0.9rem', width: '18px', textAlign: 'center' }}>◈</span>
              <span>Evolutions</span>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                transition: 'transform 0.2s ease',
                transform: evoOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                display: 'inline-block',
              }}
            >
              ›
            </span>
          </button>

          {evoOpen && (
            <div className="ml-4 mt-1 space-y-0.5 fade-in">
              {evolutions.map((evo) => (
                <NavLink
                  key={evo.path}
                  to={evo.path}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    transition: 'all 0.15s ease',
                    color: isActive ? '#C9C9C9' : '#4A4A62',
                    background: isActive ? 'rgba(139,0,0,0.1)' : 'transparent',
                    borderLeft: isActive ? `2px solid ${evo.color}` : '2px solid transparent',
                  })}
                >
                  <span style={{ fontSize: '0.8rem', width: '16px', textAlign: 'center' }}>
                    {evo.icon}
                  </span>
                  <span>{evo.label}</span>
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: evo.color + '50' }}
                  />
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Connections status */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid #252540' }}>
        <p
          style={{
            fontSize: '0.6rem',
            color: '#4A4A68',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontFamily: 'DM Mono, monospace',
            marginBottom: '12px',
          }}
        >
          Connections
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '0.7rem', color: '#5A5A72', letterSpacing: '0.04em' }}>
              Notion
            </span>
            {notionSync?.configured ? (
              <span style={{ fontSize: '0.65rem', color: '#22C55E', fontFamily: 'DM Mono, monospace' }}>
                {notionSync.last_sync ? formatRelativeTime(notionSync.last_sync) : '● Live'}
              </span>
            ) : (
              <span style={{ fontSize: '0.65rem', color: '#4A4A68' }}>—</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span style={{ fontSize: '0.7rem', color: '#5A5A72', letterSpacing: '0.04em' }}>
              Google Cal
            </span>
            {googleStatus?.authorized ? (
              <span style={{ fontSize: '0.65rem', color: '#22C55E', fontFamily: 'DM Mono, monospace' }}>
                ● Live
              </span>
            ) : (
              <span style={{ fontSize: '0.65rem', color: '#4A4A68' }}>—</span>
            )}
          </div>

          {integrations.perplexity?.status === 'connected' && (
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '0.7rem', color: '#5A5A72' }}>Perplexity</span>
              <span style={{ fontSize: '0.65rem', color: '#22C55E' }}>● Live</span>
            </div>
          )}
        </div>

        {hasDigest && (
          <div
            className="mt-4 px-3 py-2 rounded-lg"
            style={{
              background: 'rgba(139,0,0,0.08)',
              border: '1px solid rgba(139,0,0,0.2)',
            }}
          >
            <p
              style={{
                fontSize: '0.65rem',
                color: '#8B0000',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontFamily: 'Cinzel, Georgia, serif',
              }}
            >
              ✦ Weekly Digest
            </p>
          </div>
        )}

        {/* User footer */}
        {user && (
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid #252540' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p style={{ fontSize: '0.7rem', color: '#C9C9C9', fontWeight: 600, truncate: true }}
                   className="truncate">
                  {user.name || user.email?.split('@')[0]}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span style={{
                    fontSize: '0.6rem',
                    color: user.mode === 'operator' ? '#8B0000' : '#4A4A68',
                    background: user.mode === 'operator' ? 'rgba(139,0,0,0.12)' : 'rgba(37,37,64,0.6)',
                    border: `1px solid ${user.mode === 'operator' ? 'rgba(139,0,0,0.25)' : '#252540'}`,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontFamily: 'DM Mono, monospace',
                  }}>
                    {user.mode === 'operator' ? 'Operator' : 'Personal'}
                  </span>
                  {user.plan === 'pro' && (
                    <span style={{
                      fontSize: '0.6rem',
                      color: '#FBBF24',
                      background: 'rgba(251,191,36,0.1)',
                      border: '1px solid rgba(251,191,36,0.2)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontFamily: 'DM Mono, monospace',
                    }}>
                      Pro
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                style={{ color: '#4A4A68', fontSize: '0.7rem', padding: '4px', flexShrink: 0 }}
                className="hover:text-text-primary transition-colors"
              >
                ⏻
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-[60] w-10 h-10 flex items-center justify-center rounded-lg"
        onClick={() => setMobileOpen(true)}
        style={{
          background: 'rgba(13,13,20,0.9)',
          border: '1px solid #252540',
          color: '#C9C9C9',
          display: mobileOpen ? 'none' : undefined,
        }}
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M1 1H15M1 6H15M1 11H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[55]"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          flex flex-col min-h-screen
          w-[220px] flex-shrink-0
          fixed lg:static z-[56] top-0 left-0
          transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'rgba(20,20,36,0.97)',
          borderRight: '1px solid #252540',
          backdropFilter: 'blur(12px)',
        }}
      >
        {sidebarContent}
      </aside>

      <div className="lg:hidden h-0" />
    </>
  );
}
