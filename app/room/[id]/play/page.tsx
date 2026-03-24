'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type RoomPhase =
  | 'waiting'
  | 'room_full'
  | 'ready_check'
  | 'preamble'
  | 'beat_input'
  | 'roll_reveal'
  | 'beat_consequence'
  | 'final_panel'
  | 'completed';

type RollBand = 'critical_fail' | 'fail' | 'mixed' | 'success' | 'critical_success';

type StoryState = {
  phase: RoomPhase;
  currentBeat: 1 | 2 | 3;
  readyCheck: {
    startedAt: string | null;
    deadlineAt: string | null;
    readyByPlayerId: Record<string, boolean>;
  };
  beats: Record<
    '1' | '2' | '3',
    {
      submissions: Record<string, string>;
      revealed: boolean;
      rolls: Record<string, { value: number; band: RollBand; rolledAt: string }>;
      consequence: { text: string; mode: string; generatedAt: string } | null;
      resolved: boolean;
    }
  >;
  scoreboard: {
    playerTotals: Record<string, number>;
    teamAverage: number;
    teamBand: string;
  };
};

type RoomResponse = {
  room: {
    id: string;
    status: string;
    questName: string;
    memberCount: number;
    maxPlayers: number;
    members: Array<{ id: string; name: string }>;
    storyState: StoryState;
    hasArtifact: boolean;
    artifactId?: string;
  };
};

const POLL_MS = 2500;
const ROLL_ANIMATION_MS = 2200;
const ACTION_MAX_CHARS = 120;

function isSingleSentence(input: string): boolean {
  const compact = input.replace(/\s+/g, ' ').trim();
  if (!compact) return false;
  if (compact.includes('\n')) return false;
  const sentenceParts = compact.split(/[.!?]+/).filter((part) => part.trim().length > 0);
  return sentenceParts.length <= 1;
}

function bandLabel(band: RollBand): string {
  if (band === 'critical_success') return 'Critical success';
  if (band === 'success') return 'Success';
  if (band === 'mixed') return 'Mixed';
  if (band === 'fail') return 'Fail';
  return 'Critical fail';
}

function buildConsequenceText(
  beat: number,
  submissions: Array<{ name: string; text: string }>,
  averageRoll: number
): { mode: string; text: string } {
  const opener = `Beat ${beat} resolves with the team acting in sync.`;
  const highlights = submissions
    .slice(0, 3)
    .map((s) => `${s.name} chose to ${s.text}`)
    .join('; ');
  if (averageRoll >= 15) {
    return {
      mode: 'high_momentum',
      text: `${opener} Their combined momentum pays off (${averageRoll.toFixed(1)} avg roll): ${highlights}. The path opens with clear advantage.`,
    };
  }
  if (averageRoll >= 10) {
    return {
      mode: 'mixed_result',
      text: `${opener} The move works with tradeoffs (${averageRoll.toFixed(1)} avg roll): ${highlights}. Progress is real, but tension rises.`,
    };
  }
  return {
    mode: 'hard_choice',
    text: `${opener} The move succeeds only partially (${averageRoll.toFixed(1)} avg roll): ${highlights}. The team must adapt quickly to new pressure.`,
  };
}

export default function QuestPlayPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<RoomResponse['room'] | null>(null);
  const [myUserId, setMyUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readySubmitting, setReadySubmitting] = useState(false);
  const [actionText, setActionText] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [rollDisplayValue, setRollDisplayValue] = useState<number | null>(null);
  const [rollSubmitting, setRollSubmitting] = useState(false);
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const consequenceInFlightRef = useRef(false);

  const loadRoom = async () => {
    try {
      const res = await fetch(`/api/room/${roomId}`, { cache: 'no-store' });
      const data: RoomResponse | { error: string } = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/');
          return;
        }
        if (res.status === 403) {
          setError('You are no longer a member of this room.');
          setLoading(false);
          return;
        }
        setError((data as { error: string }).error || 'Failed to load room state.');
        setLoading(false);
        return;
      }
      setRoom((data as RoomResponse).room);
      setLoading(false);
      setError(null);
    } catch {
      setError('Could not refresh the room right now.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.id) setMyUserId(data.user.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRoom();
    const interval = setInterval(loadRoom, POLL_MS);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    if (room?.status === 'COMPLETED' && room.hasArtifact && room.artifactId) {
      router.push(`/artifact/${room.artifactId}`);
    }
  }, [room, router]);

  const storyState = room?.storyState;
  const currentBeatKey = String(storyState?.currentBeat ?? 1) as '1' | '2' | '3';
  const currentBeat = storyState?.beats[currentBeatKey];
  const players = room?.members ?? [];

  const mySubmittedAction = useMemo(
    () => (myUserId && currentBeat ? currentBeat.submissions[myUserId] : undefined),
    [currentBeat, myUserId]
  );
  const myRoll = useMemo(
    () => (myUserId && currentBeat ? currentBeat.rolls[myUserId] : undefined),
    [currentBeat, myUserId]
  );
  const readyCount = useMemo(() => {
    if (!storyState) return 0;
    return Object.values(storyState.readyCheck.readyByPlayerId).filter(Boolean).length;
  }, [storyState]);

  useEffect(() => {
    if (myRoll && !rolling) {
      setRollDisplayValue(myRoll.value);
    }
  }, [myRoll, rolling]);

  useEffect(() => {
    const run = async () => {
      if (!storyState || !currentBeat || !myUserId) return;
      if (storyState.phase !== 'beat_consequence') return;
      if (currentBeat.consequence) return;
      if (consequenceInFlightRef.current) return;
      if (players.length === 0 || players[0].id !== myUserId) return;

      const rollValues = Object.values(currentBeat.rolls).map((r) => r.value);
      if (rollValues.length !== players.length) return;
      const averageRoll = rollValues.reduce((a, b) => a + b, 0) / rollValues.length;
      const submissionList = players.map((p) => ({
        name: p.name,
        text: currentBeat.submissions[p.id] || 'support the team plan',
      }));
      const generated = buildConsequenceText(storyState.currentBeat, submissionList, averageRoll);

      consequenceInFlightRef.current = true;
      try {
        await fetch(`/api/room/${roomId}/runtime/consequence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beat: storyState.currentBeat,
            text: generated.text,
            mode: generated.mode,
          }),
        });
        await loadRoom();
      } finally {
        consequenceInFlightRef.current = false;
      }
    };
    run();
  }, [storyState, currentBeat, myUserId, players, roomId]);

  const handleReady = async () => {
    setReadySubmitting(true);
    try {
      const res = await fetch(`/api/room/${roomId}/runtime/ready-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ready: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Could not mark you as ready.');
      }
      await loadRoom();
    } finally {
      setReadySubmitting(false);
    }
  };

  const handleSubmitAction = async () => {
    const trimmed = actionText.trim();
    if (!storyState) return;
    if (!trimmed) {
      alert('Write your action first.');
      return;
    }
    if (!isSingleSentence(trimmed)) {
      alert('Use one short sentence only.');
      return;
    }
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/room/${roomId}/runtime/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beat: storyState.currentBeat,
          actionText: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not send your action.');
      } else {
        setActionText('');
      }
      await loadRoom();
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleRoll = async () => {
    if (!storyState || rolling || myRoll) return;
    const value = Math.floor(Math.random() * 20) + 1;
    const band: RollBand =
      value >= 19 ? 'critical_success' : value >= 15 ? 'success' : value >= 10 ? 'mixed' : value >= 4 ? 'fail' : 'critical_fail';

    setRolling(true);
    setRollSubmitting(true);
    const animationStart = Date.now();
    const ticker = window.setInterval(() => {
      setRollDisplayValue(Math.floor(Math.random() * 20) + 1);
    }, 80);

    try {
      const res = await fetch(`/api/room/${roomId}/runtime/roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beat: storyState.currentBeat, value, band }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not save your roll.');
      }
      const elapsed = Date.now() - animationStart;
      if (elapsed < ROLL_ANIMATION_MS) {
        await new Promise((resolve) => setTimeout(resolve, ROLL_ANIMATION_MS - elapsed));
      }
      await loadRoom();
    } finally {
      window.clearInterval(ticker);
      setRolling(false);
      setRollSubmitting(false);
    }
  };

  const handleCompleteStory = async () => {
    setCompleteSubmitting(true);
    try {
      const res = await fetch(`/api/room/${roomId}/complete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not finalize story yet.');
      }
      await loadRoom();
    } finally {
      setCompleteSubmitting(false);
    }
  };

  if (loading || !room || !storyState || !currentBeat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">{error ?? 'Loading room...'}</p>
        </div>
      </div>
    );
  }

  if (room.status === 'COMPLETED' && room.hasArtifact && room.artifactId) return null;
  if (room.status === 'COMPLETED' && !room.artifactId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow p-5 text-center">
          <p className="text-sm font-semibold text-gray-900 mb-1">Wrapping up story...</p>
          <p className="text-xs text-gray-500">Please wait</p>
        </div>
      </div>
    );
  }

  const myReady = Boolean(storyState.readyCheck.readyByPlayerId[myUserId]);
  const submissionCount = Object.keys(currentBeat.submissions).length;
  const rollCount = Object.keys(currentBeat.rolls).length;

  const phaseTitle: Record<RoomPhase, string> = {
    waiting: 'Waiting for more players',
    room_full: 'Room is full',
    ready_check: 'Ready check',
    preamble: `Beat ${storyState.currentBeat}: briefing`,
    beat_input: `Beat ${storyState.currentBeat}: your move`,
    roll_reveal: `Beat ${storyState.currentBeat}: roll reveal`,
    beat_consequence: `Beat ${storyState.currentBeat}: outcome`,
    final_panel: 'Final panel',
    completed: 'Complete',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">{phaseTitle[storyState.phase]}</p>
          <p className="text-xs text-gray-500">{room.memberCount}/{room.maxPlayers} players</p>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {(storyState.phase === 'waiting' || storyState.phase === 'room_full') && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 text-center">
            <h1 className="text-lg font-bold text-gray-900 mb-2">Waiting to start</h1>
            <p className="text-sm text-gray-600">
              The room starts once everyone is in and the ready check opens.
            </p>
          </div>
        )}

        {storyState.phase === 'ready_check' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
            <h1 className="text-lg font-bold text-gray-900 mb-2">Ready check</h1>
            <p className="text-sm text-gray-600 mb-4">Confirm when you are ready to begin the story.</p>
            <p className="text-sm font-medium text-primary-700 mb-4">{readyCount} of {players.length} ready</p>
            <button
              type="button"
              onClick={handleReady}
              disabled={myReady || readySubmitting}
              className="btn btn-primary w-full"
            >
              {myReady ? 'You are ready' : readySubmitting ? 'Saving...' : "I'm ready"}
            </button>
          </div>
        )}

        {(storyState.phase === 'preamble' || storyState.phase === 'beat_input') && (
          <div className="space-y-4">
            {storyState.phase === 'preamble' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
                <h1 className="text-lg font-bold text-gray-900 mb-2">Beat {storyState.currentBeat}</h1>
                <p className="text-sm text-gray-600">Type one short sentence describing your move.</p>
              </div>
            )}
            <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
              {mySubmittedAction ? (
                <>
                  <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1">Locked in</p>
                  <p className="text-sm text-gray-700 mb-4">{mySubmittedAction}</p>
                  <p className="text-xs text-gray-500">
                    Blind input is active: reveals after all submissions.
                  </p>
                </>
              ) : (
                <>
                  <label className="label">Your action (one sentence)</label>
                  <textarea
                    rows={3}
                    maxLength={ACTION_MAX_CHARS}
                    className="input min-h-[100px]"
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value.slice(0, ACTION_MAX_CHARS))}
                    placeholder="I redirect power to shields while we cross."
                  />
                  <p className="mt-1 text-xs text-gray-500">{actionText.length}/{ACTION_MAX_CHARS}</p>
                  <button
                    type="button"
                    onClick={handleSubmitAction}
                    disabled={actionSubmitting || !actionText.trim()}
                    className="btn btn-primary w-full mt-4"
                  >
                    {actionSubmitting ? 'Sending...' : 'Lock action'}
                  </button>
                </>
              )}
            </div>
            <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
              <p className="text-sm text-primary-800">Submissions received: {submissionCount}/{players.length}</p>
            </div>
          </div>
        )}

        {storyState.phase === 'roll_reveal' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
              <h1 className="text-lg font-bold text-gray-900 mb-2">Revealed actions</h1>
              <div className="space-y-2">
                {players.map((player) => (
                  <p key={player.id} className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">{player.name}:</span>{' '}
                    {currentBeat.submissions[player.id] ?? '...'}
                  </p>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 text-center">
              <p className="text-sm text-gray-600 mb-3">Roll to resolve your move.</p>
              <div className="w-24 h-24 mx-auto rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-3">
                <span className="text-3xl font-extrabold text-primary-700">{rollDisplayValue ?? '-'}</span>
              </div>
              {myRoll && !rolling && (
                <p className="text-sm font-semibold text-primary-700 mb-3">
                  {bandLabel(myRoll.band)}
                </p>
              )}
              <button
                type="button"
                onClick={handleRoll}
                disabled={Boolean(myRoll) || rollSubmitting}
                className="btn btn-primary w-full"
              >
                {myRoll ? 'Roll saved' : rollSubmitting ? 'Rolling...' : 'Roll d20'}
              </button>
              <p className="text-xs text-gray-500 mt-3">Rolls submitted: {rollCount}/{players.length}</p>
            </div>
          </div>
        )}

        {storyState.phase === 'beat_consequence' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
            <h1 className="text-lg font-bold text-gray-900 mb-2">Outcome in progress</h1>
            {currentBeat.consequence ? (
              <>
                <p className="text-xs text-primary-700 font-semibold uppercase tracking-wide mb-2">
                  {currentBeat.consequence.mode}
                </p>
                <p className="text-sm text-gray-700">{currentBeat.consequence.text}</p>
              </>
            ) : (
              <p className="text-sm text-gray-600">The story is resolving this beat now.</p>
            )}
          </div>
        )}

        {storyState.phase === 'final_panel' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
            <h1 className="text-lg font-bold text-gray-900 mb-3">Final panel</h1>
            <div className="space-y-2 mb-4">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{player.name}</span>
                  <span className="font-semibold text-gray-900">{storyState.scoreboard.playerTotals[player.id] ?? 0} / 60</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-primary-50 border border-primary-100">
              <p className="text-sm text-primary-800 font-semibold">
                Team average: {storyState.scoreboard.teamAverage} / 60
              </p>
            </div>
            <button
              type="button"
              onClick={handleCompleteStory}
              disabled={completeSubmitting}
              className="btn btn-primary w-full mt-4"
            >
              {completeSubmitting ? 'Finalizing...' : 'Finish story'}
            </button>
          </div>
        )}

        {storyState.phase === 'completed' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 text-center">
            <h1 className="text-lg font-bold text-gray-900 mb-2">Wrapping up story</h1>
            <p className="text-sm text-gray-600">
              Finalizing your artifact and results. This page will update automatically.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
