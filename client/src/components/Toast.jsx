import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    timersRef.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timersRef.current[id];
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const toast = useCallback({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 5000),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning', 4000),
  }, [addToast]);

  // Reassign as a callable with methods
  const toastFn = (msg, type) => addToast(msg, type);
  toastFn.success = toast.success;
  toastFn.error = toast.error;
  toastFn.info = toast.info;
  toastFn.warning = toast.warning;

  return (
    <ToastContext.Provider value={toastFn}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 360 }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto slide-up flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl text-sm font-mono"
            style={{
              background: '#12121A',
              borderColor: t.type === 'success' ? '#22C55E40' : t.type === 'error' ? '#F8717140' : t.type === 'warning' ? '#FBBF2440' : '#60A5FA40',
            }}
            onClick={() => removeToast(t.id)}
          >
            <span style={{
              color: t.type === 'success' ? '#22C55E' : t.type === 'error' ? '#F87171' : t.type === 'warning' ? '#FBBF24' : '#60A5FA',
            }}>
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <span className="text-text-primary flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
