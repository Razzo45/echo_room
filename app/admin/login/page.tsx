'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
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
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim() === '' ? undefined : email, 
          password 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      router.push('/admin');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred. Please check the console for details.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <div className="hero-event rounded-b-[2rem] bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Admin Access</h1>
        <p className="text-white/80 text-base font-medium">Enter admin password to continue</p>
      </div>

      <div className="flex-1 px-4 -mt-6 relative z-10 max-w-md mx-auto w-full pb-8 safe-bottom">
        <div className="card-elevated">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="admin@example.com"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to use admin password only.</p>
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
              />
            </div>
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-100">
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Verifying…' : 'Log in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
