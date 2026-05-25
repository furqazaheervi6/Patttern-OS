import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const TABS = [
  { path: '/',            icon: '⬡', label: 'Home'      },
  { path: '/calendar',   icon: '◷', label: 'Calendar'  },
  { path: '/patterns',   icon: '⬟', label: 'Patterns'  },
  { path: '/initiatives',icon: '◈', label: 'Goals'     },
  { path: '/settings',   icon: '⚙', label: 'Settings'  },
];

export default function MobileTabBar() {
  const { user } = useAuth();
  const location = useLocation();

  // Hide on login/onboarding
  if (!user || location.pathname === '/login' || location.pathname === '/onboarding') {
    return null;
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: 'rgba(13,13,20,0.97)',
        borderTop: '1px solid #252540',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 4px',
            minWidth: '56px',
            gap: '3px',
            color: isActive ? '#C9C9C9' : '#3A3A50',
            textDecoration: 'none',
            transition: 'color 0.15s ease',
            position: 'relative',
          })}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '32px',
                    height: '2px',
                    background: '#8B0000',
                    borderRadius: '0 0 2px 2px',
                  }}
                />
              )}
              <span
                style={{
                  fontSize: '1.05rem',
                  lineHeight: 1,
                  color: isActive ? '#C9C9C9' : '#3A3A50',
                }}
              >
                {tab.icon}
              </span>
              <span
                style={{
                  fontSize: '0.55rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'DM Mono, monospace',
                  color: isActive ? '#8B8B8B' : '#2A2A40',
                  marginTop: '1px',
                }}
              >
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
