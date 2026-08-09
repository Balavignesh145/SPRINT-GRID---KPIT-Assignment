import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { auth } from '../api/client';
import { ApiRequestError } from '../api/client';

export function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.login({ email, password });
      qc.setQueryData(['auth', 'me'], res);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4"
      style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/brand/sprintgrid-logo.png" alt="SprintGrid Logo" className="object-contain mb-3" style={{ width: 56, height: 56, mixBlendMode: 'screen', filter: 'brightness(1.1)' }} />
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Welcome back
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Sign in to SprintGrid
          </p>
        </div>

        {/* Demo hint */}
        <div className="mb-6 p-3 rounded-lg text-xs space-y-1"
          style={{ background: 'rgb(158 228 123 / 0.08)', border: '1px solid rgb(158 228 123 / 0.2)', color: 'var(--color-brand)' }}>
          <p><strong>Demo Workspace:</strong> <code className="font-semibold font-mono">balavignesh10thactive2020@gmail.com</code> / <code className="font-semibold font-mono">Bala@2005</code></p>
          <p className="text-[11px] opacity-80">Alt: <code className="font-mono">arun@sprintgrid.local</code> / <code className="font-mono">Password123!</code></p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-soft)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-soft)' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm outline-none transition-all"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword((v) => !v)}
                style={{ color: 'var(--color-muted)' }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'rgb(248 113 113 / 0.08)', border: '1px solid rgb(248 113 113 / 0.2)', color: 'var(--color-danger)' }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-[1.01] disabled:opacity-60"
            style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--color-muted)' }}>
          No account?{' '}
          <Link to="/register" style={{ color: 'var(--color-brand)' }}>
            Create workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
