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
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <Link href="/world" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium text-sm mb-6">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to World Map
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="page-title">My Rooms & Artifacts</h1>
            <p className="page-subtitle">Your quest history and decision maps</p>
            {levelLabel && (
              <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                Level: {levelLabel}
              </span>
            )}
          </div>
          <Link href="/profile" className="btn btn-secondary">Edit profile</Link>
        </header>

        {rooms.length === 0 ? (
          <div className="card-elevated text-center py-12">
            <p className="text-gray-600 mb-4">You haven&apos;t joined any quests yet.</p>
            <Link href="/world" className="btn btn-primary">Explore World Map</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <div key={room.id} className="card-elevated hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">{room.questName}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <span className="font-mono">{room.roomCode}</span>
                      <span>·</span>
                      <span>{room.memberCount}{room.maxPlayers != null ? ` / ${room.maxPlayers}` : ''} in room</span>
                      <span>·</span>
                      <span className="capitalize">{room.status.replace('_', ' ').toLowerCase()}</span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      room.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      room.status === 'IN_PROGRESS' ? 'bg-primary-100 text-primary-800' :
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {room.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  {room.status === 'COMPLETED' && room.hasArtifact && room.artifactId && (
                    <Link href={`/artifact/${room.artifactId}`} className="btn btn-primary">View decision map</Link>
                  )}
                  {room.status === 'IN_PROGRESS' && (
                    <Link href={`/room/${room.id}/play`} className="btn btn-primary">Continue quest</Link>
                  )}
                  {(room.status === 'OPEN' || room.status === 'FULL') && (
                    <Link href={`/room/${room.id}`} className="btn btn-secondary">View room</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <section className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Your badges</h3>
          <p className="text-sm text-gray-600 mb-4">
            Earn badges by completing quests, collaborating with teams, and making decisions together.
          </p>
          <BadgeDisplay />
        </section>

        <div className="mt-8">
          <Link href="/people" className="btn btn-secondary">People</Link>
        </div>

        <section className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy</h3>
          <p className="text-sm text-gray-600 mb-4">
            You can delete all your data at any time. This will remove your profile, room memberships, votes, and artifacts.
          </p>
          <button onClick={handleDeleteData} className="btn btn-danger">Delete all my data</button>
        </section>
      </div>
    </div>
  );
}
