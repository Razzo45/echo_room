'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganiserLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/organiser/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }
      router.push('/organiser/dashboard');
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="hero-event rounded-b-[2rem]">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Organiser portal</h1>
        <p className="text-white/90 text-base font-medium">Echo Room management</p>
      </div>

      <div className="flex-1 px-4 -mt-6 relative z-10 max-w-md mx-auto w-full pb-8 safe-bottom">
        <div className="card-elevated">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Organiser password"
                className="input"
                required
              />
            </div>
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-100">
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn btn-primary w-full"
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
          <p className="mt-5 pt-5 border-t border-gray-200 text-center text-sm text-gray-500">
            Need access? Contact your system administrator.
          </p>
        </div>

        <p className="mt-6 text-center">
          <a href="/" className="text-primary-600 hover:text-primary-700 text-sm font-medium">← Back to participant login</a>
        </p>
      </div>
    </div>
  );
}
