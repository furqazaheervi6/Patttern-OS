import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { DashboardSkeleton, EvolutionSkeleton } from './components/Skeleton.jsx';

// Lazy load pages for bundle optimization
const Home = lazy(() => import('./pages/Home.jsx'));
const History = lazy(() => import('./pages/History.jsx'));
const Digest = lazy(() => import('./pages/Digest.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Construction = lazy(() => import('./pages/Construction.jsx'));
const Sojourney = lazy(() => import('./pages/Sojourney.jsx'));
const Kaizen = lazy(() => import('./pages/Kaizen.jsx'));
const Harmony = lazy(() => import('./pages/Harmony.jsx'));
const Omnivision = lazy(() => import('./pages/Omnivision.jsx'));
const TwoHundred = lazy(() => import('./pages/TwoHundred.jsx'));
const Humanity = lazy(() => import('./pages/Humanity.jsx'));

function PageFallback() {
  return <DashboardSkeleton />;
}

function EvoFallback() {
  return <EvolutionSkeleton />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="flex min-h-screen bg-bg">
          <Sidebar />
          <main className="flex-1 overflow-y-auto min-w-0">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Suspense fallback={<PageFallback />}><Home /></Suspense>} />
                <Route path="/history" element={<Suspense fallback={<PageFallback />}><History /></Suspense>} />
                <Route path="/digest" element={<Suspense fallback={<PageFallback />}><Digest /></Suspense>} />
                <Route path="/settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
                <Route path="/evolution/construction" element={<Suspense fallback={<EvoFallback />}><Construction /></Suspense>} />
                <Route path="/evolution/sojourney" element={<Suspense fallback={<EvoFallback />}><Sojourney /></Suspense>} />
                <Route path="/evolution/kaizen" element={<Suspense fallback={<EvoFallback />}><Kaizen /></Suspense>} />
                <Route path="/evolution/harmony" element={<Suspense fallback={<EvoFallback />}><Harmony /></Suspense>} />
                <Route path="/evolution/omnivision" element={<Suspense fallback={<EvoFallback />}><Omnivision /></Suspense>} />
                <Route path="/evolution/200" element={<Suspense fallback={<EvoFallback />}><TwoHundred /></Suspense>} />
                <Route path="/evolution/humanity" element={<Suspense fallback={<EvoFallback />}><Humanity /></Suspense>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
