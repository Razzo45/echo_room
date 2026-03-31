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
  storyState?: {
    phase?: string;
    currentBeat?: number;
    readyCheck?: { readyByPlayerId?: Record<string, boolean> };
    beats?: Record<string, { submissions?: Record<string, string>; rolls?: Record<string, unknown>; consequence?: { text: string } | null }>;
    finalSynthesis?: { status?: string };
  } | null;
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

  const runRoomAction = async (roomId: string, action: string, confirmText: string) => {
    if (!confirm(confirmText)) return;
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, roomId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Action failed');
        return;
      }
      await loadRooms();
    } catch {
      alert('Action failed');
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
      <div className="min-h-screen flex items-center justify-center bg-admin-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-500/30 border-t-primary-500 mx-auto mb-4" />
          <p className="text-zinc-400">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-admin-bg text-admin-text">
      <header className="sticky top-0 z-20 bg-admin-surface border-b border-admin-border shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 font-semibold text-sm mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold tracking-tight mt-2 font-display">Rooms Management</h1>
              <p className="text-sm text-zinc-400 mt-0.5">{rooms.length} total rooms · Inactive rooms auto-close after 1 week</p>
            </div>
            <button
              type="button"
              onClick={handleCloseInactive}
              className="btn min-h-[48px] bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-2xl font-semibold"
            >
              Close inactive (1 week)
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8 safe-bottom">
        <div className="space-y-4">
          {rooms.map((room) => (
            <div key={room.id} className="bg-admin-surface rounded-2xl border border-admin-border p-6 shadow-sm">
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
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
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
                  <div className="mt-2 text-xs text-zinc-300 grid grid-cols-1 md:grid-cols-2 gap-1">
                    <p>Phase: <span className="font-semibold text-white">{room.storyState?.phase || 'n/a'}</span></p>
                    <p>Current beat: <span className="font-semibold text-white">{room.storyState?.currentBeat ?? 'n/a'}</span></p>
                    <p>
                      Ready: <span className="font-semibold text-white">
                        {Object.values(room.storyState?.readyCheck?.readyByPlayerId || {}).filter(Boolean).length}/
                        {Object.keys(room.storyState?.readyCheck?.readyByPlayerId || {}).length}
                      </span>
                    </p>
                    <p>
                      Final synthesis: <span className="font-semibold text-white">{room.storyState?.finalSynthesis?.status || 'n/a'}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {(room.status === 'OPEN' || room.status === 'FULL') && (
                  <button
                    type="button"
                    onClick={() => handleForceStart(room.id)}
                    className="btn min-h-[44px] bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-2xl text-sm font-semibold"
                  >
                    Force Start
                  </button>
                )}
                {(room.status === 'IN_PROGRESS' || room.status === 'COMPLETED') && (
                  <button
                    type="button"
                    onClick={() => handleCloseRoom(room.id)}
                    className="btn btn-secondary min-h-[44px] bg-gray-600 text-white border-gray-500 hover:bg-gray-500 rounded-2xl text-sm"
                  >
                    Close room
                  </button>
                )}
                {room.status === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    onClick={() => runRoomAction(room.id, 'mark_completed', 'Mark this room as completed now?')}
                    className="btn min-h-[44px] bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-2xl text-sm"
                  >
                    Mark completed
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => runRoomAction(room.id, 'reset_ready_check', 'Reset ready-check for this room?')}
                  className="btn min-h-[44px] bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-2xl text-sm"
                >
                  Reset ready-check
                </button>
                <button
                  type="button"
                  onClick={() => runRoomAction(room.id, 'reopen_beat', 'Reopen current beat for edits?')}
                  className="btn min-h-[44px] bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-2xl text-sm"
                >
                  Reopen beat
                </button>
                <button
                  type="button"
                  onClick={() => runRoomAction(room.id, 'skip_beat', 'Skip current beat?')}
                  className="btn min-h-[44px] bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-2xl text-sm"
                >
                  Skip beat
                </button>
                <button
                  type="button"
                  onClick={() => runRoomAction(room.id, 'force_consequence_generation', 'Force consequence state now?')}
                  className="btn min-h-[44px] bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-2xl text-sm"
                >
                  Force consequence
                </button>
                <button
                  type="button"
                  onClick={() => runRoomAction(room.id, 'regenerate_final_synthesis', 'Request final synthesis regeneration?')}
                  className="btn min-h-[44px] bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-2xl text-sm"
                >
                  Regenerate final
                </button>
                {room.status === 'CLOSED' && room.hasArtifact && room.artifactId && (
                  <Link
                    href={`/artifact/${room.artifactId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn min-h-[44px] bg-primary-600 text-white hover:bg-primary-700 rounded-2xl text-sm font-semibold inline-flex items-center justify-center"
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
          <section className="mt-10">
            <h2 className="text-xl font-bold text-white mb-4">Archived artifacts</h2>
            <p className="text-sm text-zinc-400 mb-4">Closed rooms with artifacts — quick access</p>
            <div className="space-y-3">
              {rooms
                .filter((r) => r.status === 'CLOSED' && r.hasArtifact && r.artifactId)
                .map((room) => (
                  <div key={room.id} className="bg-admin-surface rounded-2xl border border-admin-border p-4 flex flex-wrap items-center justify-between gap-3">
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
                      className="btn min-h-[44px] bg-primary-600 text-white hover:bg-primary-700 rounded-2xl text-sm font-semibold inline-flex items-center justify-center"
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
