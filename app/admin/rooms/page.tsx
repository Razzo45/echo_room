'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setRooms(data.rooms);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load rooms:', err);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin - All Rooms</h1>
          <p className="text-gray-600">{rooms.length} total rooms</p>
        </div>

        <div className="space-y-4">
          {rooms.map((room) => (
            <div key={room.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-gray-900">{room.questName}</h2>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        room.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : room.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : room.status === 'FULL'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
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

              <div className="flex gap-2">
                {(room.status === 'OPEN' || room.status === 'FULL') && (
                  <button onClick={() => handleForceStart(room.id)} className="btn btn-secondary text-sm">
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
