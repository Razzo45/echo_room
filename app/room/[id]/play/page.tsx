'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Vote = {
  userId: string;
  userName: string;
  decisionNumber: number;
  optionKey: string;
  justification: string;
};

type Commit = {
  decisionNumber: number;
  committedOption: string;
};

type DecisionOption = {
  label: string;
  tradeoffs: string;
  risks: string[];
  outcomes: string[];
};

type Decision = {
  number: number;
  title: string;
  description: string;
  options: {
    A: DecisionOption;
    B: DecisionOption;
    C: DecisionOption;
  };
};

type RoomData = {
  id: string;
  status: string;
  currentDecision: number;
  memberCount?: number;
  maxPlayers?: number;
  members: Array<{ id: string; name: string }>;
  votes: Vote[];
  commits: Commit[];
  decisionsData?: { decisions: Decision[] } | null;
  artifactId?: string;
};

export default function QuestPlayPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | null>(null);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUserId(data.user.id);
        }
      });

    loadRoom();
    const interval = setInterval(loadRoom, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  const loadRoom = async () => {
    try {
      const res = await fetch(`/api/room/${roomId}`);
      const data = await res.json();

      if (!res.ok) {
        // Handle unauthorized / not-a-member more gracefully
        if (res.status === 401) {
          router.push('/');
          return;
        }
        if (res.status === 403) {
          setRoomError(
            'You are no longer a member of this room. Please return to the City District and rejoin the quest.'
          );
          setRoom(null);
          setLoading(false);
          return;
        }

        setRoomError(data.error || 'Failed to load room. Please try again from the City District.');
        setRoom(null);
        setLoading(false);
        return;
      }

      setRoom(data.room);
      setLoading(false);
      
      // Note: Redirect logic is handled in the render function above
      // to ensure it happens immediately when status changes to COMPLETED
    } catch (err) {
      console.error('Failed to load room:', err);
    }
  };

  const handleVote = async () => {
    if (!selectedOption || !justification.trim() || !myCurrentDecision) {
      alert('Please select an option and provide justification');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          decisionNumber: myCurrentDecision,
          optionKey: selectedOption,
          justification: justification.trim(),
        }),
      });

      if (res.ok) {
        setSelectedOption(null);
        setJustification('');
        await loadRoom();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to vote');
      }
    } catch (err) {
      alert('Failed to submit vote');
    }
    setSubmitting(false);
  };

  // COMPLETED: show vote breakdown and artifact link (async flow: artifact already generated when all voted)
  if (room && room.status === 'COMPLETED') {
    if (room.artifactId) {
      return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="card mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Quest complete</h1>
              <p className="text-gray-600 mb-6">All votes are in. Here’s how everyone voted, then view your decision map.</p>
              {[1, 2, 3].map((num) => {
                const decision = room!.decisionsData?.decisions?.find((d: Decision) => d.number === num);
                const votesForNum = (room!.votes || []).filter((v: Vote) => v.decisionNumber === num);
                const counts: Record<'A' | 'B' | 'C', number> = { A: 0, B: 0, C: 0 };
                votesForNum.forEach((v: Vote) => {
                  const k = v.optionKey as 'A' | 'B' | 'C';
                  if (k in counts) counts[k]++;
                });
                const majority = (['A', 'B', 'C'] as const).slice().sort(
                  (a, b) => counts[b] - counts[a]
                )[0];
                return (
                  <div key={num} className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      Decision {num}{decision ? `: ${decision.title}` : ''}
                    </h2>
                    <p className="text-sm text-gray-600 mb-2">Majority: Option {majority}</p>
                    <ul className="space-y-1 text-sm">
                      {votesForNum.map((v: Vote) => (
                        <li key={`${v.userId}-${num}`}>
                          <span className="font-medium">{v.userName}</span>: Option {v.optionKey}
                          {v.justification ? ` — "${v.justification}"` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              <a
                href={`/artifact/${room.artifactId}`}
                className="btn btn-primary inline-block"
              >
                View decision map
              </a>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing your decision map...</p>
        </div>
      </div>
    );
  }

  if (loading || !room) {
    if (roomError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Disconnected from room</h1>
            <p className="text-gray-600 mb-4">{roomError}</p>
            <button
              onClick={() => router.push('/district')}
              className="btn btn-primary"
            >
              Back to City District
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quest...</p>
        </div>
      </div>
    );
  }

  // Guard against quests that don't have decision data (e.g., FORM quests)
  if (!room.decisionsData || !Array.isArray(room.decisionsData.decisions)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quest not supported</h1>
          <p className="text-gray-600 mb-4">
            This quest does not use the collaborative decision flow. Please return to the City
            District and choose a decision room quest.
          </p>
          <button
            onClick={() => router.push('/district')}
            className="btn btn-primary"
          >
            Back to City District
          </button>
        </div>
      </div>
    );
  }

  // Per-user progress: next decision I need to vote for (1, 2, 3) or 4 if I'm done
  const myVotes = room.votes.filter((v) => v.userId === userId);
  const myCurrentDecision = ([1, 2, 3] as const).find((n) => !myVotes.some((v) => v.decisionNumber === n)) ?? 4;
  const completedCount = room.members.filter(
    (m) => room.votes.filter((v) => v.userId === m.id).length === 3
  ).length;

  // I've finished all 3: show waiting for others
  if (myCurrentDecision === 4) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">You’re done</h2>
            <p className="text-gray-600 mb-4">
              You’ve answered all three decisions. Results and the decision map will appear once everyone in the room has finished.
            </p>
            <p className="text-sm text-gray-500">
              {completedCount} of {room.members.length} have completed all decisions
            </p>
            <p className="mt-4 text-xs text-gray-400">This page updates every few seconds.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentDecisionData = room.decisionsData.decisions.find(
    (d) => d.number === myCurrentDecision
  );

  if (!currentDecisionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Decision not found</h1>
          <p className="text-gray-600 mb-4">Decision {myCurrentDecision} is not available.</p>
          <button onClick={() => router.push('/world')} className="btn btn-primary">Back to World</button>
        </div>
      </div>
    );
  }

  if (!currentDecisionData.options?.A || !currentDecisionData.options?.B || !currentDecisionData.options?.C) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Options missing</h1>
          <button onClick={() => window.location.reload()} className="btn btn-primary">Refresh</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-600">
              Your progress: Decision {myCurrentDecision} of 3
            </span>
            <span className="text-sm text-gray-500">
              {room.memberCount != null && room.maxPlayers != null
                ? `${room.memberCount} of ${room.maxPlayers} in room`
                : null}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${(myVotes.length / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="card mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentDecisionData.title}</h1>
          <p className="text-gray-700">{currentDecisionData.description}</p>
        </div>

        <div className="space-y-4 mb-6">
          {(['A', 'B', 'C'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedOption(key)}
              className={`w-full text-left p-6 rounded-lg border-2 transition-all ${
                selectedOption === key
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-4">
                  <span
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                      selectedOption === key ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {key}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-2">
                    {currentDecisionData.options[key].label}
                  </p>
                  <p className="text-sm text-gray-600">{currentDecisionData.options[key].tradeoffs}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedOption && (
          <div className="card mb-6">
            <label className="label">Why did you choose this option? (max 160 characters)</label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value.slice(0, 160))}
              className="input"
              rows={3}
              maxLength={160}
              placeholder="Share your reasoning..."
            />
            <p className="mt-2 text-sm text-gray-500">{justification.length}/160</p>
          </div>
        )}

        <button
          onClick={handleVote}
          disabled={!selectedOption || !justification.trim() || submitting}
          className="btn btn-primary w-full text-lg"
        >
          {submitting ? 'Submitting...' : 'Submit vote'}
        </button>
      </div>
    </div>
  );
}
