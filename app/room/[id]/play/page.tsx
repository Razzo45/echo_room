'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { D20Die } from '@/components/D20Die';

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

type BeatNumber = 1 | 2 | 3 | 4 | 5;
type BeatKey = '1' | '2' | '3' | '4' | '5';

type StoryState = {
  phase: RoomPhase;
  currentBeat: BeatNumber;
  totalBeats?: BeatNumber;
  readyCheck: {
    startedAt: string | null;
    deadlineAt: string | null;
    readyByPlayerId: Record<string, boolean>;
  };
  beats: Record<
    BeatKey,
    {
      submissions: Record<string, string>;
      revealed: boolean;
      rolls: Record<string, { value: number; band: RollBand; rolledAt: string }>;
      consequence: { text: string; mode: string; generatedAt: string } | null;
      resolved: boolean;
    }
  >;
  finalSynthesis?: {
    status: 'idle' | 'pending' | 'done';
    text: string;
    mode: string;
  };
  rollContinue?: {
    beat: BeatNumber;
    byPlayerId: Record<string, boolean>;
  } | null;
  consequenceContinue?: {
    beat: BeatNumber;
    byPlayerId: Record<string, boolean>;
  } | null;
};

type DecisionOption = {
  label: string;
  tradeoffs?: string;
  risks?: string[];
  outcomes?: string[];
};

type QuestDecisionData = {
  number: number;
  title: string;
  description: string;
  options: Record<string, DecisionOption>;
};

type DecisionsPayload = { decisions: QuestDecisionData[] };

type RoomResponse = {
  room: {
    id: string;
    status: string;
    questName: string;
    questDescription?: string;
    decisionsData?: DecisionsPayload | null;
    memberCount: number;
    maxPlayers: number;
    members: Array<{ id: string; name: string; completedAt?: string | null }>;
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

function getBeatMeta(
  decisionsData: DecisionsPayload | null | undefined,
  beat: number
): QuestDecisionData | null {
  if (!decisionsData?.decisions?.length) return null;
  return decisionsData.decisions.find((d) => d.number === beat) ?? null;
}

function optionBlurb(opt: DecisionOption | undefined): string {
  if (!opt) return '';

  const sentencePool = [
    opt.tradeoffs,
    ...(opt.outcomes ?? []),
    ...(opt.risks ?? []),
  ]
    .filter((v): v is string => Boolean(v && v.trim()))
    .flatMap((text) =>
      text
        .split(/[.!?]+/)
        .map((s) => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    );

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const sentence of sentencePool) {
    const key = sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(sentence);
    if (unique.length >= 2) break;
  }

  const concise = unique.join('. ');
  if (!concise) return 'Use this as a directional nudge, not a strict script.';

  const clipped = concise.length > 160 ? `${concise.slice(0, 157).trimEnd()}...` : concise;
  return clipped.endsWith('.') ? clipped : `${clipped}.`;
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
  const advanceInFlightRef = useRef(false);
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);
  const [consequenceEnteredAt, setConsequenceEnteredAt] = useState<number | null>(null);
  const [aiGracePeriodDone, setAiGracePeriodDone] = useState(false);

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
  const currentBeatKey = String(storyState?.currentBeat ?? 1) as BeatKey;
  const currentBeat = storyState?.beats?.[currentBeatKey];
  const players = room?.members ?? [];
  const decisionsData = room?.decisionsData ?? null;
  const currentMeta = storyState ? getBeatMeta(decisionsData, storyState.currentBeat) : null;

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

  const prevBeatRef = useRef<number | null>(null);
  useEffect(() => {
    const beat = storyState?.currentBeat ?? null;
    if (prevBeatRef.current !== null && beat !== prevBeatRef.current) {
      setRollDisplayValue(null);
      setRolling(false);
      setRollSubmitting(false);
    }
    prevBeatRef.current = beat;
  }, [storyState?.currentBeat]);

  useEffect(() => {
    if (myRoll && !rolling) {
      setRollDisplayValue(myRoll.value);
    }
  }, [myRoll, rolling]);

  const AI_GRACE_MS = 10_000;
  useEffect(() => {
    if (storyState?.phase === 'beat_consequence') {
      const isAi = currentBeat?.consequence?.mode === 'ai';
      if (isAi) {
        setAiGracePeriodDone(true);
        return;
      }
      if (consequenceEnteredAt === null) {
        setConsequenceEnteredAt(Date.now());
        setAiGracePeriodDone(false);
      }
    } else {
      setConsequenceEnteredAt(null);
      setAiGracePeriodDone(false);
    }
  }, [storyState?.phase, currentBeat?.consequence?.mode]);

  useEffect(() => {
    if (storyState?.phase !== 'beat_consequence' || aiGracePeriodDone || consequenceEnteredAt === null) return;
    const remaining = AI_GRACE_MS - (Date.now() - consequenceEnteredAt);
    if (remaining <= 0) {
      setAiGracePeriodDone(true);
      return;
    }
    const timer = setTimeout(() => setAiGracePeriodDone(true), remaining);
    return () => clearTimeout(timer);
  }, [storyState?.phase, consequenceEnteredAt, aiGracePeriodDone]);

  const handleAdvance = async () => {
    if (!storyState) return;
    if (storyState.phase !== 'beat_consequence' && storyState.phase !== 'roll_reveal') return;
    if (storyState.phase === 'beat_consequence' && !currentBeat?.consequence) return;
    if (advanceInFlightRef.current || advanceSubmitting) return;
    advanceInFlightRef.current = true;
    setAdvanceSubmitting(true);
    try {
      const res = await fetch(`/api/room/${roomId}/runtime/advance`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not continue yet.');
      }
      await loadRoom();
    } finally {
      advanceInFlightRef.current = false;
      setAdvanceSubmitting(false);
    }
  };

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
      setRollDisplayValue(value);
      await loadRoom();
    } finally {
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
    const allMembersTappedFinish = players.length > 0 && players.every((p) => p.completedAt);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow p-5 text-center">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {allMembersTappedFinish ? 'Building your artifact…' : 'Waiting for everyone to finish'}
          </p>
          <p className="text-xs text-gray-500">
            {allMembersTappedFinish
              ? 'This usually takes a few seconds. Keep this page open.'
              : 'Each player needs to tap “Finish story” on the final panel. This screen will refresh automatically.'}
          </p>
        </div>
      </div>
    );
  }

  const myReady = Boolean(storyState.readyCheck.readyByPlayerId[myUserId]);
  const submissionCount = Object.keys(currentBeat.submissions).length;
  const rollCount = Object.keys(currentBeat.rolls).length;

  const isBriefingReadyPhase =
    storyState.phase === 'room_full' || storyState.phase === 'ready_check';

  const rc = storyState.rollContinue;
  const myRollContinueAck =
    rc && rc.beat === storyState.currentBeat ? Boolean(rc.byPlayerId[myUserId]) : false;
  const rollContinueReady =
    rc && rc.beat === storyState.currentBeat
      ? Object.entries(rc.byPlayerId).filter(([, v]) => v).length
      : 0;
  const allRolled = rollCount >= players.length;

  const cc = storyState.consequenceContinue;
  const myContinueAck =
    cc && cc.beat === storyState.currentBeat ? Boolean(cc.byPlayerId[myUserId]) : false;
  const continueReady =
    cc && cc.beat === storyState.currentBeat
      ? Object.entries(cc.byPlayerId).filter(([, v]) => v).length
      : 0;
  const continueTotal = players.length;

  const myFinalTapped = Boolean(players.find((p) => p.id === myUserId)?.completedAt);
  const allFinalTapped = players.length > 0 && players.every((p) => p.completedAt);
  const finalSynthesisReady =
    storyState.finalSynthesis?.status === 'done' && Boolean(storyState.finalSynthesis?.text?.trim());

  const phaseTitle: Record<RoomPhase, string> = {
    waiting: 'Waiting for more players',
    room_full: 'Before we start',
    ready_check: 'Before we start',
    preamble: 'The scene',
    beat_input: 'Your line',
    roll_reveal: 'Reveal & roll',
    beat_consequence: 'What happens next',
    final_panel: 'Final panel',
    completed: 'Complete',
  };

  const pathKeys = currentMeta?.options ? ['A', 'B', 'C'].filter((k) => currentMeta.options[k]) : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">{phaseTitle[storyState.phase]}</p>
          <p className="text-xs text-gray-500">{room.memberCount}/{room.maxPlayers} players</p>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {storyState.phase === 'waiting' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 text-center">
            <h1 className="text-lg font-bold text-gray-900 mb-2">Waiting for players</h1>
            <p className="text-sm text-gray-600">
              The room opens the briefing and ready button once enough players have joined ({room.memberCount}/
              {room.maxPlayers} here now).
            </p>
          </div>
        )}

        {isBriefingReadyPhase && (
          <div className="space-y-4">
            {(room.questDescription || room.questName) && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Beat 0 · Briefing
                </p>
                <p className="text-base font-bold text-gray-900">{room.questName}</p>
                {room.questDescription ? (
                  <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap leading-relaxed">
                    {room.questDescription}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-3 italic">No scenario briefing was set for this quest.</p>
                )}
              </div>
            )}
            <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
              <h1 className="text-lg font-bold text-gray-900 mb-2">Ready to begin</h1>
              <p className="text-sm text-gray-600 mb-4">
                When everyone has read the briefing above, confirm you are ready. The story starts once all players
                tap the button.
              </p>
              <p className="text-sm font-medium text-primary-700 mb-4">
                {readyCount} of {players.length} ready
              </p>
              <button
                type="button"
                onClick={handleReady}
                disabled={myReady || readySubmitting}
                className="btn btn-primary w-full"
              >
                {myReady ? 'You are ready' : readySubmitting ? 'Saving...' : "I'm ready"}
              </button>
            </div>
          </div>
        )}

        {(storyState.phase === 'preamble' || storyState.phase === 'beat_input') && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 space-y-3">
              {currentMeta ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Beat {storyState.currentBeat}{storyState.totalBeats ? ` of ${storyState.totalBeats}` : ''}</p>
                  <h1 className="text-lg font-bold text-gray-900 leading-snug">{currentMeta.title}</h1>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{currentMeta.description}</p>
                </>
              ) : (
                <p className="text-sm text-gray-600">Write one short sentence describing your move.</p>
              )}
            </div>
            {pathKeys.length > 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Paths (reference only)
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  These are not votes — use them as inspiration, then write your own line.
                </p>
                <div className="grid gap-2">
                  {pathKeys.map((key) => (
                    <div key={key} className="rounded-xl bg-white border border-gray-100 p-3 text-sm">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-800 text-xs font-bold mr-2">
                        {key}
                      </span>
                      <span className="font-semibold text-gray-900">{currentMeta?.options[key]?.label}</span>
                      <p className="text-gray-600 mt-1 pl-9">{optionBlurb(currentMeta?.options[key])}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
              {mySubmittedAction ? (
                <>
                  <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1">Locked in</p>
                  <p className="text-sm text-gray-700 mb-4">{mySubmittedAction}</p>
                  <p className="text-xs text-gray-500">Blind input is active: reveals after all submissions.</p>
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
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Revealed actions</h2>
              <div className="space-y-1.5">
                {players.map((player) => (
                  <p key={player.id} className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">{player.name}:</span>{' '}
                    {currentBeat.submissions[player.id] ?? '...'}
                  </p>
                ))}
              </div>
            </div>

            {!allRolled && (
              <>
                <D20Die
                  value={rollDisplayValue}
                  rolling={rolling && !myRoll}
                  band={myRoll && !rolling ? myRoll.band : null}
                />
                <button
                  type="button"
                  onClick={handleRoll}
                  disabled={Boolean(myRoll) || rollSubmitting}
                  className="btn btn-primary w-full"
                >
                  {myRoll ? 'Roll saved' : rollSubmitting ? 'Rolling...' : 'Roll d20'}
                </button>
                <p className="text-xs text-gray-500 text-center">Rolls submitted: {rollCount}/{players.length}</p>
              </>
            )}

            {allRolled && (
              <>
                <D20Die
                  value={rollDisplayValue}
                  rolling={false}
                  band={myRoll ? myRoll.band : null}
                />
                <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 space-y-3">
                  <h2 className="text-sm font-semibold text-gray-900 mb-2">All rolls are in</h2>
                  <div className="space-y-2">
                    {players.map((player) => {
                      const r = currentBeat.rolls[player.id];
                      if (!r) return null;
                      const bandLabel =
                        r.band === 'critical_success' ? 'Crit!' : r.band === 'critical_fail' ? 'Fumble' :
                        r.band === 'success' ? 'Success' : r.band === 'fail' ? 'Fail' : 'Mixed';
                      const bandColor =
                        r.band === 'critical_success' || r.band === 'success' ? 'text-emerald-600' :
                        r.band === 'critical_fail' || r.band === 'fail' ? 'text-red-600' : 'text-amber-600';
                      return (
                        <div key={player.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{player.name}</span>
                          <span className={`font-bold ${bandColor}`}>
                            d20 → {r.value} <span className="font-normal text-xs">({bandLabel})</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-sm font-medium text-primary-800">
                    Ready to continue: {rollContinueReady} / {players.length}
                  </p>
                  <p className="text-xs text-gray-500">
                    Tap Continue once you have reviewed the rolls. The story advances when everyone is ready.
                  </p>
                  <button
                    type="button"
                    onClick={handleAdvance}
                    disabled={myRollContinueAck || advanceSubmitting}
                    className="btn btn-primary w-full"
                  >
                    {myRollContinueAck
                      ? 'You are ready — waiting for others'
                      : advanceSubmitting
                        ? 'Saving...'
                        : 'Continue'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {storyState.phase === 'beat_consequence' && (() => {
          const hasConsequence = Boolean(currentBeat.consequence);
          const isAi = currentBeat.consequence?.mode === 'ai';
          const showWaiting = hasConsequence && !isAi && !aiGracePeriodDone;

          if (!hasConsequence) {
            return (
              <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 space-y-3">
                <h1 className="text-lg font-bold text-gray-900">What happened</h1>
                <p className="text-sm text-gray-600">The story is resolving this beat now.</p>
              </div>
            );
          }

          if (showWaiting) {
            return (
              <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 space-y-3 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-600 mx-auto" />
                <p className="text-sm font-semibold text-gray-900">Waiting for effects...</p>
                <p className="text-xs text-gray-500">The narrator is weaving the consequences of your actions.</p>
              </div>
            );
          }

          return (
            <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 space-y-3">
              <h1 className="text-lg font-bold text-gray-900">What happened</h1>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{currentBeat.consequence!.text}</p>
              <p className="text-sm font-medium text-primary-800">
                Ready to continue: {continueReady} / {continueTotal}
              </p>
              <p className="text-xs text-gray-500">
                Everyone taps Continue when ready. The story moves on only after all players have continued.
              </p>
              <button
                type="button"
                onClick={handleAdvance}
                disabled={myContinueAck || advanceSubmitting}
                className="btn btn-primary w-full"
              >
                {myContinueAck
                  ? 'You are ready — waiting for others'
                  : advanceSubmitting
                    ? 'Saving...'
                    : 'Continue'}
              </button>
            </div>
          );
        })()}

        {storyState.phase === 'final_panel' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
            <h1 className="text-lg font-bold text-gray-900 mb-3">Story complete</h1>
            {finalSynthesisReady && (
              <div className="p-4 rounded-xl bg-primary-50 border border-primary-100 mb-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {storyState.finalSynthesis?.text}
                </p>
              </div>
            )}
            {!finalSynthesisReady && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Drafting final synthesis...</p>
                <p className="text-xs text-amber-800 mt-1">
                  Hold tight. We are compiling the collaborative story outcome before finish is enabled.
                </p>
              </div>
            )}
            {myFinalTapped ? (
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                {allFinalTapped ? (
                  <p>Everyone has finished. Handing off to the artifact…</p>
                ) : (
                  <p>
                    You have finished. Waiting for other players to tap <span className="font-semibold">Finish story</span>
                    …
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCompleteStory}
                disabled={completeSubmitting || !finalSynthesisReady}
                className="btn btn-primary w-full mt-4"
              >
                {completeSubmitting
                  ? 'Finalizing...'
                  : finalSynthesisReady
                    ? 'Finish story'
                    : 'Waiting for final synthesis...'}
              </button>
            )}
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
