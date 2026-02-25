'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BadgeDisplay } from '@/components/BadgeDisplay';

export default function BadgesPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) router.push('/');
        else if (data.user) setUserName(data.user.name);
      })
      .catch(() => router.push('/'));
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/me" className="p-2 -ml-2 rounded-xl text-primary-600 hover:bg-primary-50 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">My Rooms</span>
        </Link>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Badges</h1>
      </div>
      <main className="max-w-lg mx-auto px-4 py-4">
        <p className="text-sm text-gray-500 mb-4">Achievements and milestones from quests and decisions.</p>
        <BadgeDisplay />
      </main>
    </div>
  );
}
