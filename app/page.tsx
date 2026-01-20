'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid event code');
        setLoading(false);
        return;
      }

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
