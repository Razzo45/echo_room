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
        if (data.error) {
          router.push('/');
          return;
        }
        setUserName(data.user.name);
      })
      .catch(() => {
        router.push('/');
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/me"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to My Rooms
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Badges</h1>
          <p className="text-gray-600">Your achievements and collaborative storytelling milestones</p>
        </div>

        <BadgeDisplay />
      </div>
    </div>
  );
}
