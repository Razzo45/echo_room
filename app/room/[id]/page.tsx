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
    const interval = setInterval(loadRoom, 3000); // Poll every 3 seconds
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

      // Redirect if room already started
      if (data.room.status === 'IN_PROGRESS') {
        router.push(`/room/${roomId}/play`);
      } else if (data.room.status === 'COMPLETED') {
        if (data.room.hasArtifact) {
          router.push(`/artifact/${data.room.artifactId}`);
        }
      }
    } catch (err) {
      console.error('Failed to load room:', err);
    }
  };

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="card mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{room.questName}</h1>
            <p className="text-lg text-gray-600">{room.questDescription}</p>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="text-center">
              <p className="text-sm text-primary-700 font-semibold mb-1">Room Code</p>
              <p className="text-2xl font-mono font-bold text-primary-900">{room.roomCode}</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
              <span className="text-sm text-gray-600">
                {room.memberCount} / {room.maxPlayers} players
              </span>
            </div>

            <div className="space-y-3">
              {room.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-600">
                      {member.role} at {member.organisation}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      Ready
                    </span>
                  </div>
                </div>
              ))}

              {[...Array(Math.max(0, (room.maxPlayers ?? 3) - room.members.length))].map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center p-4 bg-gray-100 rounded-lg border border-gray-300 border-dashed"
                >
                  <div className="flex-1">
                    <p className="text-gray-500">Waiting for player...</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="animate-pulse w-6 h-6 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Async play:</strong> The quest will start automatically when at least {room.minPlayersToStart} player(s) have joined. Once it starts, the room is locked and everyone can answer the three decisions at their own pace. Results and the decision map appear when everyone has finished.
            </p>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/world')}
            className="text-gray-600 hover:text-gray-900"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
