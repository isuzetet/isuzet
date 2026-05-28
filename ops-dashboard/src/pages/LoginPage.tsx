import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';

const IDENTITY_BASE = import.meta.env.VITE_IDENTITY_API_BASE ?? 'http://localhost:3001';

type Step = 'phone' | 'otp';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // For existing OPS_ADMIN users, /auth/register returns 409 but still triggers OTP.
      // We swallow 409 and proceed to OTP entry.
      const res = await fetch(`${IDENTITY_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), fullName: 'OPS Admin', role: 'OPS_ADMIN' }),
      });

      if (!res.ok && res.status !== 409) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
      }

      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${IDENTITY_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error?.message ?? `Verification failed (${res.status})`);
      }

      const data = body?.data as {
        access_token: string;
        refresh_token: string;
        user: { id: string; fullName: string; role: string };
      };

      if (!data?.access_token) {
        throw new Error('Invalid response from server');
      }

      const allowedRoles = ['OPS_ADMIN', 'SUPER_ADMIN', 'OPS_VIEWER'];
      if (!allowedRoles.includes(data.user.role)) {
        throw new Error('Access denied: insufficient permissions for this dashboard');
      }

      localStorage.setItem('accessToken', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);

      const storeUser = {
        id: data.user.id,
        name: data.user.fullName,
        role: data.user.role as 'OPS_ADMIN' | 'SUPER_ADMIN' | 'OPS_VIEWER',
      };
      localStorage.setItem('opsUser', JSON.stringify(storeUser));
      setUser(storeUser);

      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-isuzet-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-isuzet-surface border border-isuzet-border rounded-xl p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-isuzet-text">ISUZET OPS</h1>
          <p className="text-isuzet-secondary text-sm mt-1">Operations Dashboard</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-sm text-isuzet-secondary mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 911 234 567"
                className="w-full px-3 py-2 rounded-lg bg-isuzet-bg border border-isuzet-border text-isuzet-text placeholder-isuzet-secondary focus:outline-none focus:border-brand-primary"
                autoFocus
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full py-2 rounded-lg bg-brand-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-isuzet-secondary text-sm">
              Enter the OTP sent to <span className="text-isuzet-text font-medium">{phone}</span>
            </p>

            <div>
              <label className="block text-sm text-isuzet-secondary mb-1">One-Time Password</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-3 py-2 rounded-lg bg-isuzet-bg border border-isuzet-border text-isuzet-text text-center text-xl tracking-widest placeholder-isuzet-secondary focus:outline-none focus:border-brand-primary"
                autoFocus
                inputMode="numeric"
                maxLength={6}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full py-2 rounded-lg bg-brand-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setError(null); }}
              className="w-full py-2 text-sm text-isuzet-secondary hover:text-isuzet-text"
            >
              ← Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
