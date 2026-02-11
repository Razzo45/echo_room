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
  artifactId: string | null;
  lastActivityAt: string | null;
  closedAt: string | null;
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

  const handleCloseRoom = async (roomId: string) => {
    if (!confirm('Close this room? Artifacts will remain available in Archived.')) return;

    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close_room', roomId }),
      });
      const data = await res.json();
      if (res.ok) {
        await loadRooms();
      } else {
        alert(data.error || 'Failed to close room');
      }
    } catch (err) {
      alert('Failed to close room');
    }
  };

  const handleCloseInactive = async () => {
    if (!confirm('Close all rooms with no activity for 1 week?')) return;

    try {
      const res = await fetch('/api/admin/rooms/close-inactive', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `${data.closed} room(s) closed.`);
        await loadRooms();
      } else {
        alert(data.error || 'Failed to close inactive rooms');
      }
    } catch (err) {
      alert('Failed to close inactive rooms');
    }
  };

  const inactiveCutoff = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  };

  const formatTimer = (room: RoomSummary) => {
    if (room.status !== 'IN_PROGRESS') return null;
    const last = room.lastActivityAt ? new Date(room.lastActivityAt) : new Date(room.createdAt);
    const cutoff = inactiveCutoff();
    if (last >= cutoff) {
      const daysLeft = 7 - Math.floor((Date.now() - last.getTime()) / (24 * 60 * 60 * 1000));
      return `Auto-closes in ${daysLeft} day(s) if no activity`;
    }
    return 'Eligible for auto-close (no activity 1+ week)';
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
              <p className="text-sm text-gray-400">{rooms.length} total rooms · Inactive rooms auto-close after 1 week</p>
            </div>
            <button
              onClick={handleCloseInactive}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition text-sm"
            >
              Close inactive (1 week)
            </button>
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
                        room.status === 'CLOSED'
                          ? 'bg-gray-600 text-gray-200'
                          : room.status === 'COMPLETED'
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
                    {room.lastActivityAt && (
                      <>
                        <span>•</span>
                        <span title={new Date(room.lastActivityAt).toISOString()}>
                          Last activity: {new Date(room.lastActivityAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                    {room.closedAt && (
                      <>
                        <span>•</span>
                        <span>Closed: {new Date(room.closedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                  {formatTimer(room) && (
                    <p className="text-xs text-amber-400 mt-1">{formatTimer(room)}</p>
                  )}
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
                {(room.status === 'IN_PROGRESS' || room.status === 'COMPLETED') && (
                  <button
                    onClick={() => handleCloseRoom(room.id)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition text-sm"
                  >
                    Close room
                  </button>
                )}
                {room.status === 'CLOSED' && room.hasArtifact && room.artifactId && (
                  <Link
                    href={`/artifact/${room.artifactId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-600 transition text-sm inline-block"
                  >
                    View archived artifact
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Archived: closed rooms with artifacts for easy retrieval */}
        {rooms.some((r) => r.status === 'CLOSED' && r.hasArtifact) && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Archived artifacts</h2>
            <p className="text-sm text-gray-400 mb-4">Closed rooms with artifacts — quick access</p>
            <div className="space-y-3">
              {rooms
                .filter((r) => r.status === 'CLOSED' && r.hasArtifact && r.artifactId)
                .map((room) => (
                  <div key={room.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-white">{room.roomCode}</span>
                      <span className="text-gray-400 ml-2">· {room.questName}</span>
                      {room.closedAt && (
                        <span className="text-gray-500 text-sm ml-2">
                          Closed {new Date(room.closedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/artifact/${room.artifactId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-600 transition text-sm"
                    >
                      View artifact
                    </Link>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
