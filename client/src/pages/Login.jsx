import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const { login, signup, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState(''); // '' | 'sending' | 'sent' | 'error'

  if (!authLoading && user) {
    return <Navigate to={user.onboarded ? '/' : '/onboarding'} replace />;
  }

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (tab === 'login') {
        const u = await login({ email: form.email, password: form.password });
        navigate(u.onboarded ? '/connect-integrations' : '/onboarding');
      } else {
        await signup({ email: form.email, password: form.password, name: form.name });
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotStatus('sending');
    try {
      await axios.post('/api/auth/forgot-password', { email: forgotEmail });
      setForgotStatus('sent');
    } catch {
      setForgotStatus('error');
    }
  };

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal transition-colors';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(139,0,0,0.08) 0%, rgba(8,14,28,1) 70%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '300px', background: 'radial-gradient(ellipse, rgba(139,0,0,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <div className="w-full max-w-sm relative" style={{ zIndex: 1 }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span style={{ color: '#8B0000', fontSize: '1.5rem' }}>◎</span>
            <span style={{ fontFamily: 'Cinzel, Georgia, serif', fontWeight: 700, fontSize: '1.1rem', color: '#C9C9C9', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              PatternOS
            </span>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#4A4A68', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
            Whole-self intelligence
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl">
          {showForgot ? (
            /* Forgot password panel */
            <div>
              <button
                onClick={() => { setShowForgot(false); setForgotStatus(''); setForgotEmail(''); }}
                className="flex items-center gap-1 text-xs text-text-muted mb-5 hover:text-text-primary transition-colors"
              >
                ← Back to sign in
              </button>

              {forgotStatus === 'sent' ? (
                <div className="text-center py-4">
                  <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✉️</div>
                  <p className="text-sm text-text-primary font-medium mb-2">Check your email</p>
                  <p className="text-xs text-text-muted leading-relaxed">
                    If <span style={{ color: '#C9C9C9' }}>{forgotEmail}</span> is registered, you'll receive a reset link shortly. It expires in 1 hour.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <p className="text-sm text-text-primary font-medium mb-1">Forgot your password?</p>
                    <p className="text-xs text-text-muted mb-4">Enter your email and we'll send you a reset link.</p>
                    <label className="text-xs text-text-muted block mb-1.5">Email</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoFocus
                      className={inputCls}
                    />
                  </div>

                  {forgotStatus === 'error' && (
                    <div className="px-3.5 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
                      Something went wrong. Please try again.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={forgotStatus === 'sending'}
                    className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all duration-200 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}
                  >
                    {forgotStatus === 'sending' ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Login / Signup panel */
            <>
              <div className="flex gap-1 mb-6 p-1 rounded-xl bg-bg">
                {['login', 'signup'].map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(''); }}
                    className="flex-1 py-2 text-xs rounded-lg transition-all duration-200 font-medium"
                    style={tab === t
                      ? { background: 'rgba(139,0,0,0.15)', color: '#C9C9C9', border: '1px solid rgba(139,0,0,0.25)' }
                      : { color: '#5A5A72' }
                    }
                  >
                    {t === 'login' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === 'signup' && (
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Your name"
                      className={inputCls}
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-text-muted block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className={inputCls}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-text-muted">Password</label>
                    {tab === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setShowForgot(true); setForgotEmail(form.email); }}
                        className="text-xs hover:underline transition-colors"
                        style={{ color: '#5A7A8A' }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={form.password}
                    onChange={set('password')}
                    placeholder={tab === 'signup' ? 'At least 8 characters' : 'Your password'}
                    required
                    className={inputCls}
                  />
                </div>

                {error && (
                  <div className="px-3.5 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all duration-200 disabled:opacity-50 mt-2"
                  style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}
                >
                  {submitting ? '...' : tab === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-xs text-text-muted mt-5">
                {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(''); }} className="text-teal hover:underline">
                  {tab === 'login' ? 'Sign up free' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-text-muted mt-6 leading-relaxed">
          By signing up you agree to the terms of use. Your data is private and never sold.
        </p>
      </div>
    </div>
  );
}
