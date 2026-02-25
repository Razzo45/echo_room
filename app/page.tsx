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
          if (data.needsProfile) {
            router.push('/profile');
          } else {
            router.push('/world');
          }
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-primary-50 via-white to-gray-50">
      <div className="w-full max-w-md">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 mb-5">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2">
            Echo Room
          </h1>
          <p className="text-primary-700 font-medium text-lg mb-1">
            AI Powered Decision Environment
          </p>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            You don&apos;t leave with slides. You leave with a decision map.
          </p>
        </div>

        {/* Event code card */}
        <div className="card-elevated">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="event-code" className="label">
                Enter event code
              </label>
              <input
                id="event-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SMARTCITY26"
                className="input uppercase text-center text-lg font-mono tracking-widest"
                required
                maxLength={20}
                autoFocus
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                Remember me (stay logged in for 30 days)
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="btn btn-primary w-full text-base py-3.5"
            >
              {loading ? 'Verifying…' : 'Continue'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have a code? Contact your event organiser.
        </p>
      </div>
    </div>
  );
}
