'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Member = {
  id: string;
  name: string;
  organisation: string;
  role: string;
};

type RoomData = {
  id: string;
  roomCode: string;
  status: string;
  questName: string;
  questDescription: string;
  memberCount: number;
  maxPlayers: number;
  minPlayersToStart: number;
  members: Member[];
};

export default function RoomLobbyPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoom();
    const interval = setInterval(loadRoom, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  const loadRoom = async () => {
    try {
      const res = await fetch(`/api/room/${roomId}`);
      const data = await res.json();
      if (data.error) {
        router.push('/world');
        return;
      }
      setRoom(data.room);
      setLoading(false);
      if (data.room.status === 'IN_PROGRESS') {
        router.push(`/room/${roomId}/play`);
      } else if (data.room.status === 'COMPLETED' && data.room.hasArtifact) {
        router.push(`/artifact/${data.room.artifactId}`);
      }
    } catch {
      // keep previous state
    }
  };

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading room…</p>
        </div>
      </div>
    );
  }

  const maxPlayers = room.maxPlayers ?? 3;
  const emptySlots = Math.max(0, maxPlayers - room.members.length);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/world')}
          className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1 pr-4">Room</h1>
      </div>

      <main className="max-w-lg mx-auto px-4 pt-4">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-primary-600 px-4 py-6 text-center">
            <h2 className="text-xl font-bold text-white mb-1">{room.questName}</h2>
            <p className="text-white/80 text-sm">{room.questDescription}</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide text-center mb-1">Share this code</p>
            <p className="text-3xl font-mono font-bold text-gray-900 text-center tracking-[0.25em] py-3">{room.roomCode}</p>

            <div className="flex items-center justify-between mt-4 mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Team</h3>
              <span className="text-xs text-gray-500">{room.memberCount} / {maxPlayers}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1">
              {room.members.map((member) => (
                <div key={member.id} className="shrink-0 flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[72px]">{member.name}</span>
                </div>
              ))}
              {[...Array(emptySlots)].map((_, i) => (
                <div key={`empty-${i}`} className="shrink-0 flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                  <span className="text-xs text-gray-400">—</span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-primary-50 border border-primary-100">
              <p className="text-sm text-primary-800">
                Quest starts when {room.minPlayersToStart}+ have joined. Then everyone answers 3 decisions at their own pace. Decision map appears when all are done.
              </p>
            </div>
          </div>
        </div>
        <p className="text-center mt-4">
          <button type="button" onClick={() => router.push('/world')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            Leave room
          </button>
        </p>
      </main>
    </div>
  );
}
