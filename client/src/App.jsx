import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ToastProvider } from './components/Toast.jsx';
import ChatBot from './components/ChatBot.jsx';
import { DashboardSkeleton, EvolutionSkeleton } from './components/Skeleton.jsx';
import HellenicBackground from './components/HellenicBackground.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';

const Home         = lazy(() => import('./pages/Home.jsx'));
const CalendarPage = lazy(() => import('./pages/Calendar.jsx'));
const History      = lazy(() => import('./pages/History.jsx'));
const Digest       = lazy(() => import('./pages/Digest.jsx'));
const Settings     = lazy(() => import('./pages/Settings.jsx'));
const Ops          = lazy(() => import('./pages/Ops.jsx'));
const Initiatives  = lazy(() => import('./pages/Initiatives.jsx'));
const Login        = lazy(() => import('./pages/Login.jsx'));
const Onboarding   = lazy(() => import('./pages/Onboarding.jsx'));
const Construction = lazy(() => import('./pages/Construction.jsx'));
const Sojourney    = lazy(() => import('./pages/Sojourney.jsx'));
const Kaizen       = lazy(() => import('./pages/Kaizen.jsx'));
const Harmony      = lazy(() => import('./pages/Harmony.jsx'));
const Omnivision   = lazy(() => import('./pages/Omnivision.jsx'));
const TwoHundred   = lazy(() => import('./pages/TwoHundred.jsx'));
const Humanity     = lazy(() => import('./pages/Humanity.jsx'));

function AuthGate({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080E1C' }}>
        <span style={{ color: '#8B0000', fontSize: '1.5rem' }}>◎</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user.onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function AppShell() {
  const [chatOpen, setChatOpen] = useState(true);
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen relative" style={{ zIndex: 1 }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/login"      element={<Suspense fallback={null}><Login /></Suspense>} />
            <Route path="/onboarding" element={<Suspense fallback={null}><Onboarding /></Suspense>} />

            {/* Protected */}
            <Route path="/"                    element={<AuthGate><Suspense fallback={<DashboardSkeleton />}><Home /></Suspense></AuthGate>} />
            <Route path="/calendar"            element={<AuthGate><Suspense fallback={<DashboardSkeleton />}><CalendarPage /></Suspense></AuthGate>} />
            <Route path="/history"             element={<AuthGate><Suspense fallback={<DashboardSkeleton />}><History /></Suspense></AuthGate>} />
            <Route path="/digest"              element={<AuthGate><Suspense fallback={<DashboardSkeleton />}><Digest /></Suspense></AuthGate>} />
            <Route path="/settings"            element={<AuthGate><Suspense fallback={<DashboardSkeleton />}><Settings /></Suspense></AuthGate>} />
            <Route path="/ops"                 element={<AuthGate><Suspense fallback={<DashboardSkeleton />}><Ops /></Suspense></AuthGate>} />
            <Route path="/initiatives"         element={<AuthGate><Suspense fallback={<DashboardSkeleton />}><Initiatives /></Suspense></AuthGate>} />
            <Route path="/evolution/construction" element={<AuthGate><Suspense fallback={<EvolutionSkeleton />}><Construction /></Suspense></AuthGate>} />
            <Route path="/evolution/sojourney"    element={<AuthGate><Suspense fallback={<EvolutionSkeleton />}><Sojourney /></Suspense></AuthGate>} />
            <Route path="/evolution/kaizen"       element={<AuthGate><Suspense fallback={<EvolutionSkeleton />}><Kaizen /></Suspense></AuthGate>} />
            <Route path="/evolution/harmony"      element={<AuthGate><Suspense fallback={<EvolutionSkeleton />}><Harmony /></Suspense></AuthGate>} />
            <Route path="/evolution/omnivision"   element={<AuthGate><Suspense fallback={<EvolutionSkeleton />}><Omnivision /></Suspense></AuthGate>} />
            <Route path="/evolution/200"          element={<AuthGate><Suspense fallback={<EvolutionSkeleton />}><TwoHundred /></Suspense></AuthGate>} />
            <Route path="/evolution/humanity"     element={<AuthGate><Suspense fallback={<EvolutionSkeleton />}><Humanity /></Suspense></AuthGate>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {user && <ChatBot open={chatOpen} onToggle={() => setChatOpen(v => !v)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <HellenicBackground />
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
