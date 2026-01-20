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

  // Check if user is already logged in
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          // User is already logged in, redirect
          if (data.needsProfile) {
            router.push('/profile');
          } else {
            router.push('/world');
          }
          return;
        }
        // Not logged in, check localStorage for saved event code
        const savedCode = localStorage.getItem('echo_room_event_code');
        if (savedCode) {
          setCode(savedCode);
        }
        setCheckingSession(false);
      })
      .catch(() => {
        // Check localStorage for saved event code
        const savedCode = localStorage.getItem('echo_room_event_code');
        if (savedCode) {
          setCode(savedCode);
        }
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
        body: JSON.stringify({ 
          code: code.trim(),
          rememberMe: rememberMe,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid event code');
        setLoading(false);
        return;
      }

      // Save event code to localStorage for quick re-entry
      localStorage.setItem('echo_room_event_code', code.trim().toUpperCase());
      
      if (data.needsProfile) {
        router.push('/profile');
      } else {
        router.push('/world');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            Echo Room
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            AI Powered Decision Environment
          </p>
          <p className="text-sm text-gray-500 italic">
            You don't leave with slides. You leave with a decision map.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Enter Event Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SMARTCITY26"
                className="input uppercase text-center text-xl font-mono tracking-wider"
                required
                maxLength={20}
                autoFocus
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
                Remember me (stay logged in for 30 days)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="btn btn-primary w-full text-lg"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Don't have a code? Contact your event organizer.
          </p>
        </div>
      </div>
    </div>
  );
}
