import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import axios from 'axios';
import { formatRelativeTime } from '../utils/formatters.js';

const navItems = [
  { path: '/', icon: '⬡', label: 'Dashboard' },
  { path: '/history', icon: '📈', label: 'History' },
  { path: '/digest', icon: '✦', label: 'Digests' },
  { path: '/settings', icon: '⚙', label: 'Settings' },
];

const evolutions = [
  { path: '/evolution/construction', icon: '🏗️', label: 'Construction', color: '#22C55E' },
  { path: '/evolution/sojourney', icon: '🧭', label: 'Sojourney', color: '#F472B6' },
  { path: '/evolution/kaizen', icon: '📐', label: 'Kaizen', color: '#60A5FA' },
  { path: '/evolution/harmony', icon: '🕉️', label: 'Harmony', color: '#C084FC' },
  { path: '/evolution/omnivision', icon: '👁️', label: 'Omnivision', color: '#06B6D4' },
  { path: '/evolution/200', icon: '📈', label: '200%', color: '#FBBF24' },
  { path: '/evolution/humanity', icon: '∞', label: 'Humanity', color: '#F97316' },
];

export default function Sidebar() {
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

  // Close mobile nav on route change
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
      <div className="px-5 py-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" style={{ color: '#60A5FA' }}>◎</span>
            <span className="font-display font-bold text-lg text-text-primary tracking-tight">
              PatternOS
            </span>
          </div>
          {/* Mobile close button */}
          <button
            className="lg:hidden text-text-muted hover:text-text-primary text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-border"
            onClick={() => setMobileOpen(false)}
          >
            ×
          </button>
        </div>
        <p className="text-xs text-text-muted mt-1 font-mono">Whole-self intelligence</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-border text-text-primary'
                  : 'text-text-muted hover:text-text-primary hover:bg-border/50'
              }`
            }
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {/* Evolutions Section */}
        <div className="pt-3 mt-3 border-t border-border">
          <button
            onClick={() => setEvoOpen(!evoOpen)}
            className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-display font-medium transition-all duration-150 ${
              isEvoActive
                ? 'text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base w-5 text-center">◈</span>
              <span>Evolutions</span>
            </div>
            <span
              className="text-xs transition-transform duration-200"
              style={{ transform: evoOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
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
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-display font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-border text-text-primary'
                        : 'text-text-muted hover:text-text-primary hover:bg-border/50'
                    }`
                  }
                >
                  <span className="text-sm w-4 text-center">{evo.icon}</span>
                  <span>{evo.label}</span>
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: evo.color + '60' }}
                  />
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Status */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        <p className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider">
          Connections
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Notion</span>
            {notionSync?.configured ? (
              <span className="text-xs text-physical">
                {notionSync.last_sync ? formatRelativeTime(notionSync.last_sync) : 'Ready'}
              </span>
            ) : (
              <span className="text-xs text-text-muted">Not set up</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Google Cal</span>
            {googleStatus?.authorized ? (
              <span className="text-xs text-physical">Live</span>
            ) : (
              <span className="text-xs text-text-muted">Not connected</span>
            )}
          </div>

          {integrations.perplexity?.status === 'connected' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Perplexity</span>
              <span className="text-xs text-physical">Live</span>
            </div>
          )}

          {integrations.mcp_slashy?.status === 'connected' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">MCP</span>
              <span className="text-xs text-physical">Live</span>
            </div>
          )}

          {integrations.webhook?.enabled && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Webhook</span>
              <span className="text-xs text-physical">Active</span>
            </div>
          )}
        </div>

        {hasDigest && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-purple-900/20 border border-purple-800/40">
            <p className="text-xs font-display font-semibold" style={{ color: '#C084FC' }}>
              Weekly digest ✦
            </p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-[60] w-10 h-10 flex items-center justify-center rounded-lg bg-surface border border-border text-text-primary"
        onClick={() => setMobileOpen(true)}
        style={{ display: mobileOpen ? 'none' : undefined }}
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <path d="M1 1H17M1 7H17M1 13H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[55] bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: static, mobile: slide-in */}
      <aside
        className={`
          flex flex-col min-h-screen border-r border-border bg-surface
          w-[220px] flex-shrink-0
          fixed lg:static z-[56] top-0 left-0
          transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Spacer for mobile (prevents content from going under fixed hamburger) */}
      <div className="lg:hidden h-0" />
    </>
  );
}
