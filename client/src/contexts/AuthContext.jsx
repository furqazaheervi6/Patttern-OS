import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const TOKEN_KEY = 'patternos_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setToken = (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      const r = await axios.get('/api/auth/me');
      setUser(r.data);
    } catch (err) {
      // Only invalidate token on explicit auth rejection; keep it on network/server errors
      if (!err.response || err.response.status === 401 || err.response.status === 403) {
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const signup = async ({ email, password, name, mode }) => {
    const r = await axios.post('/api/auth/signup', { email, password, name, mode });
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const login = async ({ email, password }) => {
    const r = await axios.post('/api/auth/login', { email, password });
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updates) => {
    const r = await axios.patch('/api/auth/me', updates);
    setUser(r.data);
    return r.data;
  };

  const refreshUser = async () => {
    try {
      const r = await axios.get('/api/auth/me');
      setUser(r.data);
      return r.data;
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Force a full page reload if this context module is hot-replaced,
// preventing stale AuthContext references in components.
if (import.meta.hot) {
  import.meta.hot.accept(() => { window.location.reload(); });
}
