'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import DualSurfaceNav from '@/components/DualSurfaceNav';

export default function BadgesPage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) router.push('/');
      })
      .catch(() => router.push('/'));
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-8">
      <DualSurfaceNav />
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 border-b"
        style={{
          borderColor: 'var(--theme-border)',
          background: 'color-mix(in srgb, var(--theme-surface) 92%, transparent)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Link
          href="/me"
          className="p-2 -ml-2 rounded text-[var(--theme-accent)] hover:opacity-80 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">My Rooms</span>
        </Link>
        <h1 className="text-lg font-bold text-[var(--theme-text)] flex-1 font-display">Badges</h1>
      </div>
      <main className="max-w-lg mx-auto px-4 py-4">
        <p className="text-sm text-[var(--theme-muted)] mb-4">
          Achievements and milestones from quests and decisions.
        </p>
        <BadgeDisplay />
      </main>
    </div>
  );
}
