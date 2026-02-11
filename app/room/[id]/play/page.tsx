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
    if (!selectedOption || !justification.trim()) {
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
          decisionNumber: room!.currentDecision,
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

  const handleCommit = async (option: 'A' | 'B' | 'C') => {
    if (!confirm(`Commit to Option ${option}? This decision cannot be changed.`)) {
      return;
    }

    try {
      const res = await fetch('/api/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          decisionNumber: room!.currentDecision,
          optionKey: option,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await loadRoom();
        if (data.isComplete) {
          // Will redirect via the effect
        }
      } else {
        alert(data.error || 'Failed to commit');
      }
    } catch (err) {
      alert('Failed to commit decision');
    }
  };

  // Immediately redirect or wait if room is completed
  if (room && room.status === 'COMPLETED') {
    // If artifact already exists, go straight to it
    if (room.artifactId) {
      router.push(`/artifact/${room.artifactId}`);
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your decision map...</p>
          </div>
        </div>
      );
    }

    // Otherwise, mark this participant as completed and wait for others
    fetch(`/api/room/${roomId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.artifactId) {
          router.push(`/artifact/${data.artifactId}`);
        } else if (!data.success) {
          console.error('Failed to mark completion:', data);
        }
      })
      .catch((err) => {
        console.error('Error marking completion:', err);
      });

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Quest Complete!</h3>
          <p className="text-gray-600">Waiting for all teammates to finish before generating the decision map…</p>
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

  const currentDecisionData = room.decisionsData.decisions.find(
    (d) => d.number === room.currentDecision
  );

  if (!currentDecisionData) {
    console.error('Decision not found:', {
      currentDecision: room.currentDecision,
      availableDecisions: room.decisionsData.decisions.map(d => d.number)
    });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Decision not found</h1>
          <p className="text-gray-600 mb-4">
            Decision {room.currentDecision} is not available in this quest.
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

  // Check if options exist
  if (!currentDecisionData.options || !currentDecisionData.options.A || !currentDecisionData.options.B || !currentDecisionData.options.C) {
    console.error('Decision options missing:', {
      decisionNumber: room.currentDecision,
      decisionTitle: currentDecisionData.title,
      hasOptions: !!currentDecisionData.options,
      hasA: !!currentDecisionData.options?.A,
      hasB: !!currentDecisionData.options?.B,
      hasC: !!currentDecisionData.options?.C,
      fullDecision: currentDecisionData
    });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Decision options missing</h1>
          <p className="text-gray-600 mb-4">
            Decision {room.currentDecision}: "{currentDecisionData.title}" is missing its options.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            This is a data issue. Please contact support or try refreshing.
          </p>
          <details className="text-left text-xs text-gray-400 mb-4">
            <summary className="cursor-pointer">Debug info</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
              {JSON.stringify(currentDecisionData, null, 2)}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const isCommitted = room.commits.some((c) => c.decisionNumber === room.currentDecision);
  const currentVotes = room.votes.filter((v) => v.decisionNumber === room.currentDecision);
  const hasVoted = currentVotes.some((v) => v.userId === userId);
  const allVoted = currentVotes.length === room.members.length;
  
  // If decision 3 is committed, room should be completed - show loading state
  const decision3Committed = room.commits.some((c) => c.decisionNumber === 3);
  if (decision3Committed && room.status !== 'COMPLETED') {
    // Room is completing, reload to get updated status
    setTimeout(() => loadRoom(), 1000);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Quest Complete!</h3>
          <p className="text-gray-600">Preparing your decision map...</p>
        </div>
      </div>
    );
  }

  const voteCounts = { A: 0, B: 0, C: 0 };
  currentVotes.forEach((v) => {
    voteCounts[v.optionKey as 'A' | 'B' | 'C']++;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-600">
              Decision {room.currentDecision} of 3
            </span>
            <span className="text-sm text-gray-600">
              {currentVotes.length} / {room.members.length} voted
              {room.memberCount != null && room.maxPlayers != null && (
                <span className="ml-2 text-gray-500">• {room.memberCount} of {room.maxPlayers} in room</span>
              )}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${(room.currentDecision / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Decision Info */}
        <div className="card mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {currentDecisionData.title}
          </h1>
          <p className="text-gray-700">{currentDecisionData.description}</p>
        </div>

        {!isCommitted && !hasVoted && (
          <>
            {/* Options */}
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
                          selectedOption === key
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {key}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-2">
                        {currentDecisionData.options[key].label}
                      </p>
                      <p className="text-sm text-gray-600">
                        {currentDecisionData.options[key].tradeoffs}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Justification */}
            {selectedOption && (
              <div className="card mb-6">
                <label className="label">Why did you choose this option? (max 160 characters)</label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value.slice(0, 160))}
                  className="input"
                  rows={3}
                  maxLength={160}
                  placeholder="Share your reasoning with the team..."
                />
                <p className="mt-2 text-sm text-gray-500">{justification.length}/160</p>
              </div>
            )}

            <button
              onClick={handleVote}
              disabled={!selectedOption || !justification.trim() || submitting}
              className="btn btn-primary w-full text-lg"
            >
              {submitting ? 'Submitting...' : 'Submit Vote'}
            </button>
          </>
        )}

        {hasVoted && !allVoted && (
          <div className="card">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Vote Submitted</h3>
              <p className="text-gray-600">Waiting for other team members to vote...</p>
              <p className="text-sm text-gray-500 mt-2">
                {currentVotes.length} / {room.members.length} votes received
              </p>
            </div>
          </div>
        )}

        {allVoted && !isCommitted && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">All Votes In</h3>
              
              <div className="space-y-4 mb-6">
                {currentVotes.map((vote) => (
                  <div key={vote.userId} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-gray-900">{vote.userName}</span>
                      <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm font-semibold rounded">
                        Option {vote.optionKey}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">"{vote.justification}"</p>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Vote Summary:</strong> {voteCounts.A > 0 && `${voteCounts.A} chose A`}
                  {voteCounts.A > 0 && voteCounts.B > 0 && ', '}
                  {voteCounts.B > 0 && `${voteCounts.B} chose B`}
                  {voteCounts.B > 0 && voteCounts.C > 0 && ', '}
                  {voteCounts.C > 0 && `${voteCounts.C} chose C`}
                </p>
              </div>

              <p className="text-sm text-gray-700 mb-4">
                Now your team must commit to one final option. Any team member can make the commitment.
              </p>

              <div className="grid grid-cols-3 gap-4">
                {(['A', 'B', 'C'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => handleCommit(key)}
                    className="btn btn-primary"
                  >
                    Commit to {key}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
