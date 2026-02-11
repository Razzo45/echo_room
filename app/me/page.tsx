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
        setLoading(false);
      })
      .catch(() => {
        router.push('/');
      });
  }, [router]);

  const handleDeleteData = async () => {
    if (!confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch('/api/data/delete', { method: 'DELETE' });
      if (res.ok) {
        // Clear localStorage when deleting data
        localStorage.removeItem('echo_room_event_code');
        router.push('/');
      } else {
        alert('Failed to delete data');
      }
    } catch (err) {
      alert('Failed to delete data');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/world"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to World Map
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Rooms & Artifacts</h1>
          <p className="text-gray-600">Your quest history and decision maps</p>
        </div>

        {rooms.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 mb-4">You haven't joined any quests yet</p>
            <Link href="/world" className="btn btn-primary">
              Explore World Map
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <div key={room.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{room.questName}</h2>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="font-mono">{room.roomCode}</span>
                      <span>•</span>
                      <span>{room.memberCount}{room.maxPlayers != null ? ` / ${room.maxPlayers}` : ''} in room</span>
                      <span>•</span>
                      <span>
                        {room.status === 'COMPLETED'
                          ? 'Completed'
                          : room.status === 'IN_PROGRESS'
                          ? 'In Progress'
                          : room.status === 'FULL'
                          ? 'Full'
                          : 'Open'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      room.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : room.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {room.status === 'COMPLETED' && room.hasArtifact && room.artifactId && (
                    <Link href={`/artifact/${room.artifactId}`} className="btn btn-primary">
                      View Decision Map
                    </Link>
                  )}
                  {room.status === 'IN_PROGRESS' && (
                    <Link href={`/room/${room.id}/play`} className="btn btn-primary">
                      Continue Quest
                    </Link>
                  )}
                  {(room.status === 'OPEN' || room.status === 'FULL') && (
                    <Link href={`/room/${room.id}`} className="btn btn-secondary">
                      View Room
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Badges</h3>
          <p className="text-sm text-gray-600 mb-4">
            Earn badges by completing quests, collaborating with teams, and making decisions together.
          </p>
          <BadgeDisplay />
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy</h3>
          <p className="text-sm text-gray-600 mb-4">
            You can delete all your data at any time. This will remove your profile, room memberships, votes, and artifacts.
          </p>
          <button onClick={handleDeleteData} className="btn btn-danger">
            Delete All My Data
          </button>
        </div>
      </div>
    </div>
  );
}
