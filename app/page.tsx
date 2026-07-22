'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, FeaturedIcon } from '@/components/ui/untitled';

export default function LandingPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid event code');
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="event-code" className="label text-center block !mb-2">
              Enter event code
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
              autoFocus
            />
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <p className="text-sm text-rose-800 font-medium text-center">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="btn btn-primary w-full"
            >
              {loading ? 'Verifying…' : 'Enter event'}
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
