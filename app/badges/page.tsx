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
    <div className="page-container bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <Link href="/me" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium text-sm mb-6">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My Rooms
        </Link>

        <header className="mb-8">
          <h1 className="page-title">My Badges</h1>
          <p className="page-subtitle">Your achievements and collaborative storytelling milestones</p>
        </header>

        <BadgeDisplay />
      </div>
    </div>
  );
}
