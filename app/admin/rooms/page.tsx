'use client';

import { useState, useEffect, useMemo } from 'react';
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
  completedAt?: string | null;
  startedAt?: string | null;
  closedAt: string | null;
  createdAt: string;
  isPrivate?: boolean;
  contentVersionId?: string | null;
  storyState?: {
    phase?: string;
    currentBeat?: number;
    readyCheck?: { readyByPlayerId?: Record<string, boolean> };
    beats?: Record<
      string,
      {
        submissions?: Record<string, string>;
        rolls?: Record<string, unknown>;
        consequence?: { text: string } | null;
      }
    >;
    finalSynthesis?: { status?: string };
  } | null;
};

function roomActivityAt(room: RoomSummary): Date {
  const raw =
    room.lastActivityAt || room.completedAt || room.startedAt || room.createdAt;
  return new Date(raw);
}

export default function AdminRoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'private' | 'open'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

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
      setSelected(new Set());
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
    } catch {
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
    } catch {
      alert('Failed to close room');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (
      !confirm(
        'Permanently delete this room and related votes/commits/artifact? This cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_room', roomId }),
      });
      const data = await res.json();
      if (res.ok) {
        await loadRooms();
      } else {
        alert(data.error || 'Failed to delete room');
      }
    } catch {
      alert('Failed to delete room');
    }
  };

  const handleCloseInactive = async () => {
    if (
      !confirm(
        'Close all OPEN / FULL / IN_PROGRESS / COMPLETED rooms with no real activity for 1 week? (Uses lastActivityAt → completedAt → startedAt → createdAt)'
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/rooms/close-inactive', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `${data.closed} room(s) closed.`);
        await loadRooms();
      } else {
        alert(data.error || 'Failed to close inactive rooms');
      }
    } catch {
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
    if (room.status === 'CLOSED') return null;
    const last = roomActivityAt(room);
    const cutoff = inactiveCutoff();
    if (last >= cutoff) {
      const daysLeft = Math.max(
        0,
        7 - Math.floor((Date.now() - last.getTime()) / (24 * 60 * 60 * 1000))
      );
      return `Auto-closes in ${daysLeft} day(s) if no activity`;
    }
    return 'Eligible for auto-close (no activity 1+ week)';
  };

  const filteredRooms = useMemo(
    () =>
      rooms.filter((r) => {
        if (filter === 'private') return Boolean(r.isPrivate);
        if (filter === 'open') return !r.isPrivate;
        return true;
      }),
    [rooms, filter]
  );

  const privateCount = rooms.filter((r) => r.isPrivate).length;
  const openCount = rooms.length - privateCount;
  const selectedCount = selected.size;
  const allFilteredSelected =
    filteredRooms.length > 0 && filteredRooms.every((r) => selected.has(r.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredRooms.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredRooms.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const runBulk = async (action: 'bulk_close' | 'bulk_delete') => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const noun = action === 'bulk_close' ? 'close' : 'permanently delete';
    if (!confirm(`${noun} ${ids.length} selected room(s)?`)) return;

    setBusy(true);
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, roomIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Bulk action failed');
        return;
      }
      alert(data.message || 'Done');
      await loadRooms();
    } catch {
      alert('Bulk action failed');
    } finally {
      setBusy(false);
    }
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
              <Link
                href="/admin"
                className="text-cyan-400 hover:text-cyan-300 font-semibold text-sm mb-2 inline-block"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold tracking-tight mt-2 font-display">
                Rooms Management
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                {rooms.length} total · {privateCount} private · {openCount} open · Inactive
                auto-close after 1 week
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseInactive}
              className="btn min-h-[48px] bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-2xl font-semibold"
            >
              Close inactive (1 week)
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {(
              [
                ['all', 'All'],
                ['private', 'Private'],
                ['open', 'Open playspace'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  filter === key
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                    : 'border-admin-border text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                className="rounded border-admin-border"
              />
              Select all visible ({filteredRooms.length})
            </label>
          </div>
          {selectedCount > 0 && (
            <div className="mt-3 pt-3 border-t border-cyan-500/30 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-cyan-100">
                {selectedCount} selected
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => runBulk('bulk_close')}
                className="btn min-h-[40px] bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-xl text-sm font-semibold"
              >
                Close selected
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runBulk('bulk_delete')}
                className="btn min-h-[40px] bg-red-700/90 text-white border border-red-500/50 hover:bg-red-600 rounded-xl text-sm font-semibold"
              >
                Delete selected
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelected(new Set())}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline ml-auto"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8 safe-bottom">
        {filteredRooms.length === 0 ? (
          <p className="text-center text-zinc-400 py-12 text-sm">No rooms match this filter.</p>
        ) : (
          <div className="surface-card-grid">
            {filteredRooms.map((room) => {
              const isSelected = selected.has(room.id);
              return (
                <div
                  key={room.id}
                  className={`bg-admin-surface rounded-2xl border p-5 shadow-sm h-full flex flex-col ${
                    isSelected ? 'border-cyan-500/60 ring-1 ring-cyan-500/30' : 'border-admin-border'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(room.id)}
                      className="mt-1.5 rounded border-admin-border"
                      aria-label={`Select ${room.roomCode}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h2 className="text-base font-bold text-white truncate">{room.questName}</h2>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
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
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold ${
                            room.isPrivate
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {room.isPrivate ? 'Private' : 'Open'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                        <span className="font-mono">{room.roomCode}</span>
                        <span>·</span>
                        <span>{room.memberCount} members</span>
                        {room.hasArtifact && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400 font-semibold">✓ Artifact</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Activity:{' '}
                        {roomActivityAt(room).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                      {formatTimer(room) && (
                        <p className="text-xs text-amber-400 mt-1">{formatTimer(room)}</p>
                      )}
                      <div className="mt-2 text-xs text-zinc-400 grid grid-cols-2 gap-1">
                        <p>
                          Phase:{' '}
                          <span className="font-semibold text-zinc-200">
                            {room.storyState?.phase || 'n/a'}
                          </span>
                        </p>
                        <p>
                          Beat:{' '}
                          <span className="font-semibold text-zinc-200">
                            {room.storyState?.currentBeat ?? 'n/a'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-admin-border">
                    {(room.status === 'OPEN' || room.status === 'FULL') && (
                      <button
                        type="button"
                        onClick={() => handleForceStart(room.id)}
                        className="btn min-h-[36px] !px-2.5 bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-xl text-xs font-semibold"
                      >
                        Force Start
                      </button>
                    )}
                    {room.status !== 'CLOSED' && (
                      <button
                        type="button"
                        onClick={() => handleCloseRoom(room.id)}
                        className="btn min-h-[36px] !px-2.5 bg-gray-600 text-white border-gray-500 hover:bg-gray-500 rounded-xl text-xs"
                      >
                        Close
                      </button>
                    )}
                    {room.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        onClick={() =>
                          runRoomAction(room.id, 'mark_completed', 'Mark this room as completed now?')
                        }
                        className="btn min-h-[36px] !px-2.5 bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-xl text-xs"
                      >
                        Mark completed
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        runRoomAction(room.id, 'reset_ready_check', 'Reset ready-check for this room?')
                      }
                      className="btn min-h-[36px] !px-2.5 bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 rounded-xl text-xs"
                    >
                      Reset ready
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(room.id)}
                      className="btn min-h-[36px] !px-2.5 bg-red-900/60 text-red-100 border border-red-500/40 hover:bg-red-800/80 rounded-xl text-xs font-semibold"
                    >
                      Delete
                    </button>
                    {room.status === 'CLOSED' && room.hasArtifact && room.artifactId && (
                      <Link
                        href={`/artifact/${room.artifactId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn min-h-[36px] !px-2.5 bg-primary-600 text-white hover:bg-primary-700 rounded-xl text-xs font-semibold inline-flex items-center"
                      >
                        Artifact
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {rooms.some((r) => r.status === 'CLOSED' && r.hasArtifact) && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-white mb-4">Archived artifacts</h2>
            <p className="text-sm text-zinc-400 mb-4">Closed rooms with artifacts — quick access</p>
            <div className="surface-card-grid">
              {rooms
                .filter((r) => r.status === 'CLOSED' && r.hasArtifact && r.artifactId)
                .map((room) => (
                  <div
                    key={room.id}
                    className="bg-admin-surface rounded-2xl border border-admin-border p-4 flex flex-col gap-3 h-full"
                  >
                    <div>
                      <span className="font-mono text-white">{room.roomCode}</span>
                      <p className="text-zinc-400 text-sm mt-0.5">{room.questName}</p>
                      {room.closedAt && (
                        <p className="text-zinc-500 text-xs mt-1">
                          Closed {new Date(room.closedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/artifact/${room.artifactId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn min-h-[40px] bg-primary-600 text-white hover:bg-primary-700 rounded-xl text-sm font-semibold inline-flex items-center justify-center mt-auto"
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
