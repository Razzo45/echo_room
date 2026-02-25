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
  const [justificationPrompt, setJustificationPrompt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [voteRecognition, setVoteRecognition] = useState<string | null>(null);
  const [badgeHint, setBadgeHint] = useState<{ name: string; hint: string } | null>(null);

  useEffect(() => {
    fetch('/api/badges/progress')
      .then((r) => r.json())
      .then((data) => {
        const storyteller = data.hints?.find((h: { badgeType: string }) => h.badgeType === 'STORYTELLER');
        if (storyteller) {
          setBadgeHint({ name: storyteller.name, hint: storyteller.hint });
        }
      })
      .catch(() => {});
  }, []);

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
        setJustificationPrompt(null);
        const res2 = await fetch(`/api/room/${roomId}`);
        const data2 = await res2.json();
        const updatedRoom = data2.room;
        if (updatedRoom && updatedRoom.votes) {
          const votesForDec = updatedRoom.votes.filter(
            (v: Vote) => v.decisionNumber === myCurrentDecision
          );
          const others = votesForDec.filter((v: Vote) => v.userId !== userId);
          const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
          votesForDec.forEach((v: Vote) => {
            counts[v.optionKey] = (counts[v.optionKey] || 0) + 1;
          });
          const majority = (['A', 'B', 'C'] as const).slice().sort(
            (a, b) => (counts[b] || 0) - (counts[a] || 0)
          )[0];
          const myVote = votesForDec.find((v: Vote) => v.userId === userId);
          if (others.length === 0) {
            setVoteRecognition("You're the first to vote on this decision.");
          } else if (myVote && myVote.optionKey === majority) {
            setVoteRecognition('Your vote matches the majority so far.');
          } else {
            setVoteRecognition(
              `${others.length} other${others.length !== 1 ? 's have' : ' has'} voted differently so far.`
            );
          }
          setTimeout(() => setVoteRecognition(null), 4000);
        }
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

  const getDecisionPersonality = (): string => {
    if (!room || !room.commits || room.commits.length === 0) return 'Strategic Optimist';
    const myVotes = room.votes.filter((v) => v.userId === userId);
    let matchCount = 0;
    for (const c of room.commits) {
      const myV = myVotes.find((v) => v.decisionNumber === c.decisionNumber);
      if (myV && myV.optionKey === c.committedOption) matchCount++;
    }
    if (matchCount === 3) return 'Consensus Seeker';
    if (matchCount === 2) return 'Strategic Optimist';
    if (matchCount === 1) return 'Risk-Averse Planner';
    return 'Bold Innovator';
  };

  if (room && room.status === 'COMPLETED') {
    if (room.artifactId) {
      return (
        <div className="min-h-screen bg-gray-50 pb-24">
          <main className="max-w-lg mx-auto px-4 py-6">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-primary-600 px-4 py-8 text-center">
                <span className="inline-flex w-16 h-16 rounded-2xl bg-white/20 items-center justify-center text-3xl mb-3">🎉</span>
                <h1 className="text-xl font-bold text-white mb-1">Decision map ready</h1>
                <p className="text-white/90 text-sm">Your team’s 3 tradeoffs, visualised.</p>
              </div>
              <div className="p-5">
                <div className="mb-4 p-4 rounded-2xl bg-primary-50 border-2 border-primary-200">
                  <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1">Your decision style</p>
                  <p className="text-lg font-bold text-primary-900">{getDecisionPersonality()}</p>
                </div>
                <p className="text-gray-600 text-sm mb-3">How everyone voted:</p>
              {[1, 2, 3].map((num) => {
                const decision = room!.decisionsData?.decisions?.find((d: Decision) => d.number === num);
                const votesForNum = (room!.votes || []).filter((v: Vote) => v.decisionNumber === num);
                const counts: Record<'A' | 'B' | 'C', number> = { A: 0, B: 0, C: 0 };
                votesForNum.forEach((v: Vote) => {
                  const k = v.optionKey as 'A' | 'B' | 'C';
                  if (k in counts) counts[k]++;
                });
                const majority = (['A', 'B', 'C'] as const).slice().sort((a, b) => counts[b] - counts[a])[0];
                return (
                  <div key={num} className="mb-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900 mb-1">
                      Decision {num}{decision ? `: ${decision.title}` : ''}
                    </h2>
                    <p className="text-xs text-gray-500 mb-2">Majority: Option {majority}</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {votesForNum.map((v: Vote) => (
                        <li key={`${v.userId}-${num}`}>
                          <span className="font-medium text-gray-900">{v.userName}</span>: Option {v.optionKey}
                          {v.justification ? ` — “${v.justification}”` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
                <a href={`/artifact/${room.artifactId}`} className="btn btn-primary w-full mt-4">
                  View decision map
                </a>
              </div>
            </div>
          </main>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Preparing your decision map…</p>
        </div>
      </div>
    );
  }

  if (loading || !room) {
    if (roomError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Disconnected from room</h1>
            <p className="text-gray-600 text-sm mb-6">{roomError}</p>
            <button onClick={() => router.push('/district')} className="btn btn-primary">Back to district</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading quest…</p>
        </div>
      </div>
    );
  }

  // Guard against quests that don't have decision data (e.g., FORM quests)
  if (!room.decisionsData || !Array.isArray(room.decisionsData.decisions)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Quest not supported</h1>
          <p className="text-gray-600 text-sm mb-6">This quest doesn’t use the collaborative decision flow. Return to the district and choose a decision room quest.</p>
          <button onClick={() => router.push('/district')} className="btn btn-primary">Back to district</button>
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-lg border border-gray-100 p-8 text-center">
          <span className="inline-flex w-16 h-16 rounded-2xl bg-green-100 text-green-600 items-center justify-center text-3xl mb-4">✓</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">You’re done</h2>
          <p className="text-gray-600 text-sm mb-4">
            Results and the decision map will appear once everyone has finished.
          </p>
          <p className="text-sm font-semibold text-primary-600">
            {completedCount} of {room.members.length} completed
          </p>
            {(() => {
              const totalVotes = room.votes.length;
              const avgLen = totalVotes > 0
                ? Math.round(room.votes.reduce((a, v) => a + (v.justification?.length ?? 0), 0) / totalVotes)
                : 0;
              const perDec = [1, 2, 3].map((num) => {
                const vs = room.votes.filter((v) => v.decisionNumber === num);
                const c: Record<string, number> = { A: 0, B: 0, C: 0 };
                vs.forEach((v) => { c[v.optionKey] = (c[v.optionKey] || 0) + 1; });
                const leader = (['A', 'B', 'C'] as const).slice().sort((a, b) => (c[b] || 0) - (c[a] || 0))[0];
                return { num, leader, count: c[leader] || 0 };
              });
              return (
                <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200 text-left max-w-sm mx-auto">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Live so far</p>
                  {totalVotes > 0 && (
                    <p className="text-sm text-gray-600 mb-2">Average justification length: {avgLen} characters</p>
                  )}
                  {perDec.map(({ num, leader, count }) => (
                    <p key={num} className="text-sm text-gray-600">
                      Decision {num}: most chosen — Option {leader}{count > 0 && ` (${count})`}
                    </p>
                  ))}
                </div>
              );
            })()}
          <p className="mt-4 text-xs text-gray-400">Updates every few seconds.</p>
        </div>
      </div>
    );
  }

  const currentDecisionData = room.decisionsData.decisions.find(
    (d) => d.number === myCurrentDecision
  );

  if (!currentDecisionData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Decision not found</h1>
          <p className="text-gray-600 text-sm mb-6">Decision {myCurrentDecision} is not available.</p>
          <button onClick={() => router.push('/world')} className="btn btn-primary">Back to World</button>
        </div>
      </div>
    );
  }

  if (!currentDecisionData.options?.A || !currentDecisionData.options?.B || !currentDecisionData.options?.C) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Options missing</h1>
          <button onClick={() => window.location.reload()} className="btn btn-primary">Refresh</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-800">Decision {myCurrentDecision} of 3</span>
          {room.memberCount != null && room.maxPlayers != null && (
            <span className="text-xs text-gray-500">{room.memberCount}/{room.maxPlayers} in room</span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(myVotes.length / 3) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {voteRecognition && (
          <div className="mb-4 p-4 rounded-2xl bg-primary-50 border-2 border-primary-200 text-sm text-primary-800 font-medium">
            {voteRecognition}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5 mb-4">
          <h1 className="text-lg font-bold text-gray-900 mb-2">{currentDecisionData.title}</h1>
          <p className="text-gray-600 text-sm leading-relaxed">{currentDecisionData.description}</p>
        </div>

        <p className="text-sm font-semibold text-gray-700 mb-2">Choose one</p>
        <div className="space-y-3 mb-4">
          {(['A', 'B', 'C'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedOption(key)}
              className={`option-tile w-full ${
                selectedOption === key
                  ? 'border-primary-600 bg-primary-600 text-white shadow-lg'
                  : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50/50'
              }`}
            >
              <span className={`shrink-0 w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center ${
                selectedOption === key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {key}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className={`font-semibold ${selectedOption === key ? 'text-white' : 'text-gray-900'}`}>
                  {currentDecisionData.options[key].label}
                </p>
                <p className={`text-sm mt-0.5 ${selectedOption === key ? 'text-white/90' : 'text-gray-600'}`}>
                  {currentDecisionData.options[key].tradeoffs}
                </p>
              </div>
              {selectedOption === key && (
                <span className="shrink-0 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </span>
              )}
            </button>
          ))}
        </div>

        {selectedOption && (
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5 mb-4">
            <label className="label">Why this option? (max 120 chars)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { key: 'risk', label: '⚖️ Risk?' },
                { key: 'benefits', label: '🌍 Benefits?' },
                { key: 'tradeoff', label: '💸 Tradeoff?' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setJustificationPrompt(key)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    justificationPrompt === key
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value.slice(0, 120))}
              className="input min-h-[80px]"
              rows={2}
              maxLength={120}
              placeholder="Share your reasoning…"
            />
            <p className="mt-1 text-xs text-gray-500">{justification.length}/120</p>
            {badgeHint && (
              <p className="mt-3 text-xs text-primary-800 bg-primary-50 rounded-xl px-3 py-2 border border-primary-200">
                📖 Close to <strong>{badgeHint.name}</strong> — {badgeHint.hint}
              </p>
            )}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom z-20">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleVote}
            disabled={!selectedOption || !justification.trim() || submitting}
            className="btn btn-primary w-full text-base"
          >
            {submitting ? 'Submitting…' : 'Submit vote'}
          </button>
        </div>
      </div>
    </div>
  );
}
