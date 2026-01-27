'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type RoomSummary = {
  id: string;
  roomCode: string;
  status: string;
  questName: string;
  memberCount: number;
  voteCount: number;
  commitCount: number;
  hasArtifact: boolean;
  createdAt: string;
};

export default function AdminRoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const res = await fetch('/api/admin/rooms');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setRooms(data.rooms);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      router.push('/admin/login');
    }
  };

  const handleForceStart = async (roomId: string) => {
    if (!confirm('Force start this room?')) return;

    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_start', roomId }),
      });

      if (res.ok) {
        await loadRooms();
      }
    } catch (err) {
      alert('Failed to force start room');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-gray-400 hover:text-white mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-white mb-2">Rooms Management</h1>
              <p className="text-sm text-gray-400">{rooms.length} total rooms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="space-y-4">
          {rooms.map((room) => (
            <div key={room.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-white">{room.questName}</h2>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        room.status === 'COMPLETED'
                          ? 'bg-green-600 text-white'
                          : room.status === 'IN_PROGRESS'
                          ? 'bg-blue-600 text-white'
                          : room.status === 'FULL'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="font-mono">{room.roomCode}</span>
                    <span>•</span>
                    <span>{room.memberCount} members</span>
                    <span>•</span>
                    <span>{room.voteCount} votes</span>
                    <span>•</span>
                    <span>{room.commitCount} commits</span>
                    {room.hasArtifact && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 font-semibold">✓ Artifact</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                {(room.status === 'OPEN' || room.status === 'FULL') && (
                  <button 
                    onClick={() => handleForceStart(room.id)} 
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition text-sm"
                  >
                    Force Start
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
