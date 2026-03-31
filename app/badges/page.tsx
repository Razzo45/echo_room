'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BadgeDisplay } from '@/components/BadgeDisplay';

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
    <div className="min-h-screen bg-[var(--quest-cream)] pb-8">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-amber-100 px-4 py-3 flex items-center gap-3">
        <Link href="/me" className="p-2 -ml-2 rounded-xl text-amber-700 hover:bg-amber-50 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">My Rooms</span>
        </Link>
        <h1 className="text-lg font-bold text-gray-900 flex-1 font-display">Badges</h1>
      </div>
      <main className="max-w-lg mx-auto px-4 py-4">
        <p className="text-sm text-stone-500 mb-4">Achievements and milestones from quests and decisions.</p>
        <BadgeDisplay />
      </main>
    </div>
  );
}
