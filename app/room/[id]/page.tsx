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
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading room…</p>
        </div>
      </div>
    );
  }

  const maxPlayers = room.maxPlayers ?? 3;
  const emptySlots = Math.max(0, maxPlayers - room.members.length);

  return (
    <div className="page-container bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="card-elevated mb-6">
          <header className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{room.questName}</h1>
            <p className="text-gray-600">{room.questDescription}</p>
          </header>

          <div className="rounded-xl bg-primary-50 border border-primary-200 p-5 mb-6">
            <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide text-center mb-1">Room code</p>
            <p className="text-2xl font-mono font-bold text-primary-900 text-center tracking-widest">{room.roomCode}</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Team members</h2>
              <span className="text-sm text-gray-500">
                {room.memberCount} / {maxPlayers} players
              </span>
            </div>
            <div className="space-y-2">
              {room.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{member.name}</p>
                    <p className="text-sm text-gray-600 truncate">{member.role} at {member.organisation}</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Ready</span>
                </div>
              ))}
              {[...Array(emptySlots)].map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-3 p-4 rounded-xl bg-gray-100/80 border border-dashed border-gray-300">
                  <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                  <p className="text-gray-500 text-sm">Waiting for player…</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-primary-50/80 border border-primary-200 p-4">
            <p className="text-sm text-primary-800">
              <strong>Async play:</strong> The quest starts when at least {room.minPlayersToStart} player(s) have joined. Once it starts, the room is locked and everyone can answer the three decisions at their own pace. Results and the decision map appear when everyone has finished.
            </p>
          </div>
        </div>

        <p className="text-center">
          <button
            type="button"
            onClick={() => router.push('/world')}
            className="btn btn-ghost text-gray-500 text-sm"
          >
            Leave room
          </button>
        </p>
      </div>
    </div>
  );
}
