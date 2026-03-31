'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
      <div className="min-h-screen flex items-center justify-center bg-[#312e81]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white mx-auto mb-4" />
          <p className="text-white/90 text-sm">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--quest-cream)]">
      {/* Event-app style hero: full-bleed gradient */}
      <div className="hero-event">
        <div className="w-16 h-16 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-1 font-display">Echo Room</h1>
        <p className="text-white/90 text-base font-medium">AI Powered Decision Environment</p>
        <p className="text-white/70 text-sm mt-2 max-w-[260px]">You don&apos;t leave with slides. You leave with a decision map.</p>
      </div>

      {/* Content: single card, code + CTA (Figma event-entry pattern) */}
      <div className="flex-1 px-4 -mt-6 relative z-10 max-w-md mx-auto w-full">
        <div className="card-elevated border border-amber-100/70">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="event-code" className="label text-center block">Enter event code</label>
            <input
              id="event-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SMARTCITY26"
              className="input text-center text-xl font-mono tracking-[0.2em] uppercase shadow-sm"
              required
              maxLength={20}
              autoFocus
            />
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-100">
                <p className="text-sm text-red-800 font-medium text-center">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="btn btn-primary w-full text-lg"
            >
              {loading ? 'Verifying…' : 'Continue'}
            </button>
            <label className="flex items-center justify-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-gray-500">Remember me (30 days)</span>
            </label>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-6 pb-8">Don&apos;t have a code? Contact your event organiser.</p>
      </div>
    </div>
  );
}
