import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('submitting');
    try {
      await axios.post('/api/auth/reset-password', { token, new_password: form.password });
      setStatus('success');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. The link may have expired.');
      setStatus('error');
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
          {status === 'success' ? (
            <div className="text-center py-4">
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✓</div>
              <p className="text-sm text-text-primary font-medium mb-2">Password updated</p>
              <p className="text-xs text-text-muted mb-6">Your password has been changed successfully.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-primary font-medium mb-1">Set a new password</p>
              <p className="text-xs text-text-muted mb-5">Choose a password that's at least 8 characters.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-text-muted block mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="At least 8 characters"
                    required
                    autoFocus
                    disabled={!token || status === 'submitting'}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs text-text-muted block mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={(e) => setForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repeat your password"
                    required
                    disabled={!token || status === 'submitting'}
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
                  disabled={!token || status === 'submitting'}
                  className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all duration-200 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}
                >
                  {status === 'submitting' ? 'Updating...' : 'Update Password'}
                </button>
              </form>

              <p className="text-center text-xs text-text-muted mt-5">
                <Link to="/login" className="text-teal hover:underline">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
