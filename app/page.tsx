'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, FeaturedIcon } from '@/components/ui/untitled';

type Mode = 'join' | 'login';

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('join');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          if (data.needsProfile) router.push('/profile');
          else router.push('/world');
          return;
        }
        const savedCode = localStorage.getItem('echo_room_event_code');
        if (savedCode) setCode(savedCode);
        setCheckingSession(false);
      })
      .catch(() => {
        const savedCode = localStorage.getItem('echo_room_event_code');
        if (savedCode) setCode(savedCode);
        setCheckingSession(false);
      });
  }, [router]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setPassword('');
    if (next === 'join') setName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'join' ? '/api/auth/start' : '/api/auth/login';
      const body =
        mode === 'join'
          ? { code: code.trim(), rememberMe }
          : { code: code.trim(), name: name.trim(), password, rememberMe };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error ||
            (mode === 'join' ? 'Invalid event code' : 'Could not log in')
        );
        setLoading(false);
        return;
      }
      localStorage.setItem('echo_room_event_code', code.trim().toUpperCase());
      if (data.needsProfile) router.push('/profile');
      else router.push('/world');
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-corridor-ink">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white mx-auto mb-4" />
          <p className="text-white/90 text-sm">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--theme-bg)]">
      <div className="hero-event z-[1]">
        <div className="relative z-10 flex flex-col items-center">
          <Badge color="blue" size="md" className="mb-4 !bg-white/10 !text-white !ring-white/20">
            Pre-event companion
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3 font-sans">
            Echo Room
          </h1>
          <p className="text-white text-lg font-medium max-w-sm leading-snug">
            Bridge cold networking with warm storytelling.
          </p>
          <p className="text-white/70 text-sm mt-3 max-w-[300px] leading-relaxed">
            Arrive already knowing people — because you made a story together.
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-8 relative z-10 max-w-md mx-auto w-full">
        <div className="card-elevated animate-slide-up">
          <div className="flex justify-center mb-4">
            <FeaturedIcon color="brand">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </FeaturedIcon>
          </div>

          <div className="flex rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] p-1 mb-5">
            <button
              type="button"
              onClick={() => switchMode('join')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'join'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-[var(--theme-muted)] hover:text-stone-700'
              }`}
            >
              Join event
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-[var(--theme-muted)] hover:text-stone-700'
              }`}
            >
              Log in
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="event-code" className="label text-center block !mb-2">
                Event code
              </label>
              <input
                id="event-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. TEST2"
                className="input text-center text-xl font-mono tracking-[0.25em] uppercase !min-h-[52px]"
                required
                maxLength={20}
                autoFocus={mode === 'join'}
              />
            </div>

            {mode === 'login' && (
              <>
                <div>
                  <label htmlFor="login-name" className="label">
                    Name
                  </label>
                  <input
                    id="login-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="The name you used"
                    className="input"
                    required
                    minLength={2}
                    maxLength={100}
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="label">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="input"
                    required
                    minLength={6}
                    maxLength={100}
                    autoComplete="current-password"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <p className="text-sm text-rose-800 font-medium text-center">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={
                loading ||
                !code.trim() ||
                (mode === 'login' && (!name.trim() || password.length < 6))
              }
              className="btn btn-primary w-full"
            >
              {loading
                ? mode === 'join'
                  ? 'Verifying…'
                  : 'Logging in…'
                : mode === 'join'
                  ? 'Enter event'
                  : 'Log in'}
            </button>
            <label className="flex items-center justify-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--theme-border)] text-corridor-signal focus:ring-corridor-signal"
              />
              <span className="text-sm text-[var(--theme-muted)]">Remember me (30 days)</span>
            </label>
          </form>

          <p className="text-center text-xs text-[var(--theme-muted)] mt-4 leading-relaxed">
            {mode === 'join'
              ? 'New here? Enter the code, then set your name and a password on your profile.'
              : 'Returning? Use the same event code, name, and password. Accounts unused for 30 days are removed.'}
          </p>
        </div>
        <p className="text-center text-sm text-[var(--theme-muted)] mt-6 pb-2">
          Don&apos;t have a code? Contact your event organiser.
        </p>
        <div className="flex justify-center gap-6 pb-10 text-sm">
          <Link href="/organiser" className="text-corridor-signal font-medium hover:underline">
            Organiser
          </Link>
          <Link href="/admin/login" className="text-corridor-signal font-medium hover:underline">
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
