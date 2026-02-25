'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BadgeDisplay } from '@/components/BadgeDisplay';

type Room = {
  id: string;
  roomCode: string;
  status: string;
  questName: string;
  memberCount: number;
  maxPlayers?: number;
  joinedAt: string;
  completedAt: string | null;
  hasArtifact: boolean;
  artifactId: string | null;
};

export default function MyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [levelLabel, setLevelLabel] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/me').then((r) => r.json()),
    ])
      .then(([userData, roomsData]) => {
        if (userData.error || roomsData.error) {
          router.push('/');
          return;
        }
        setUserName(userData.user.name);
        setRooms(roomsData.rooms);
        setLevelLabel(roomsData.levelLabel ?? null);
        setLoading(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  const handleDeleteData = async () => {
    if (!confirm('Are you sure you want to delete all your data? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/data/delete', { method: 'DELETE' });
      if (res.ok) {
        localStorage.removeItem('echo_room_event_code');
        router.push('/');
      } else {
        alert('Failed to delete data');
      }
    } catch {
      alert('Failed to delete data');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/world" className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">World</span>
        </Link>
        <h1 className="text-lg font-bold text-gray-900">My Rooms</h1>
        <Link href="/profile" className="p-2 rounded-xl text-primary-600 hover:bg-primary-50 text-sm font-medium">
          Profile
        </Link>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4">
        {levelLabel && (
          <div className="mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              Level: {levelLabel}
            </span>
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 text-center">
            <p className="text-gray-600 mb-4">You haven&apos;t joined any quests yet.</p>
            <Link href="/world" className="btn btn-primary">Explore World Map</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-lg font-bold text-gray-900 flex-1">{room.questName}</h2>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        room.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        room.status === 'IN_PROGRESS' ? 'bg-primary-100 text-primary-800' :
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {room.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-mono mb-3">{room.roomCode} · {room.memberCount}{room.maxPlayers != null ? `/${room.maxPlayers}` : ''}</p>
                  <div className="flex gap-2">
                    {room.status === 'COMPLETED' && room.hasArtifact && room.artifactId && (
                      <Link href={`/artifact/${room.artifactId}`} className="btn btn-primary flex-1">View map</Link>
                    )}
                    {room.status === 'IN_PROGRESS' && (
                      <Link href={`/room/${room.id}/play`} className="btn btn-primary flex-1">Continue</Link>
                    )}
                    {(room.status === 'OPEN' || room.status === 'FULL') && (
                      <Link href={`/room/${room.id}`} className="btn btn-secondary flex-1">View room</Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <section className="mt-8">
          <h3 className="text-base font-bold text-gray-900 mb-2">Badges</h3>
          <p className="text-sm text-gray-500 mb-3">Earn badges by completing quests and decisions.</p>
          <BadgeDisplay />
        </section>

        <div className="mt-6">
          <Link href="/people" className="btn btn-secondary w-full">People</Link>
        </div>

        <section className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-2">Privacy</h3>
          <p className="text-sm text-gray-500 mb-3">Delete your profile, rooms, votes and artifacts.</p>
          <button onClick={handleDeleteData} className="btn btn-danger w-full">Delete all my data</button>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-20">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-around">
          <span className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs font-medium">My Rooms</span>
          </span>
          <Link href="/people" className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-gray-600 hover:text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium">People</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-gray-600 hover:text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
