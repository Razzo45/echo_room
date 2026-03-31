'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { StoryState, RoomPhase, RollBand, BeatKey } from '@/lib/story-runtime';
import type { DecisionsPayload, QuestDecisionData, Player } from '@/components/play/types';
import { BriefingReady } from '@/components/play/BriefingReady';
import { BeatInput } from '@/components/play/BeatInput';
import { RollReveal } from '@/components/play/RollReveal';
import { BeatConsequence } from '@/components/play/BeatConsequence';
import { FinalPanel } from '@/components/play/FinalPanel';

type RoomResponse = {
  room: {
    id: string;
    status: string;
    questName: string;
    questDescription?: string;
    decisionsData?: DecisionsPayload | null;
    memberCount: number;
    maxPlayers: number;
    members: Player[];
    storyState: StoryState;
    hasArtifact: boolean;
    artifactId?: string;
  };
};

const POLL_MS = 2500;
const ROLL_ANIMATION_MS = 2200;

function isSingleSentence(input: string): boolean {
  const compact = input.replace(/\s+/g, ' ').trim();
  if (!compact) return false;
  if (compact.includes('\n')) return false;
  return compact.split(/[.!?]+/).filter((p) => p.trim().length > 0).length <= 1;
}

function getBeatMeta(data: DecisionsPayload | null | undefined, beat: number): QuestDecisionData | null {
  if (!data?.decisions?.length) return null;
  return data.decisions.find((d) => d.number === beat) ?? null;
}

export default function QuestPlayPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<RoomResponse['room'] | null>(null);
  const [myUserId, setMyUserId] = useState('');
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

  // ── Data fetching ──

  const loadRoom = async () => {
    try {
      const res = await fetch(`/api/room/${roomId}`, { cache: 'no-store' });
      const data: RoomResponse | { error: string } = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.push('/'); return; }
        if (res.status === 403) { setError('You are no longer a member of this room.'); setLoading(false); return; }
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
    fetch('/api/auth/me').then((r) => r.json()).then((d) => { if (d.user?.id) setMyUserId(d.user.id); }).catch(() => {});
  }, []);

  useEffect(() => { loadRoom(); const i = setInterval(loadRoom, POLL_MS); return () => clearInterval(i); }, [roomId]);

  useEffect(() => {
    if (room?.status === 'COMPLETED' && room.hasArtifact && room.artifactId) {
      router.push(`/artifact/${room.artifactId}`);
    }
  }, [room, router]);

  // ── Derived state ──

  const storyState = room?.storyState;
  const currentBeatKey = String(storyState?.currentBeat ?? 1) as BeatKey;
  const currentBeat = storyState?.beats?.[currentBeatKey];
  const players = room?.members ?? [];
  const currentMeta = storyState ? getBeatMeta(room?.decisionsData, storyState.currentBeat) : null;

  const mySubmittedAction = useMemo(
    () => (myUserId && currentBeat ? currentBeat.submissions[myUserId] : undefined),
    [currentBeat, myUserId]
  );
  const myRoll = useMemo(
    () => (myUserId && currentBeat ? currentBeat.rolls[myUserId] : undefined),
    [currentBeat, myUserId]
  );
  const readyCount = useMemo(
    () => (storyState ? Object.values(storyState.readyCheck.readyByPlayerId).filter(Boolean).length : 0),
    [storyState]
  );

  // ── Roll state management ──

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

  useEffect(() => { if (myRoll && !rolling) setRollDisplayValue(myRoll.value); }, [myRoll, rolling]);

  // ── AI grace period for consequence ──

  const AI_GRACE_MS = 10_000;
  useEffect(() => {
    if (storyState?.phase === 'beat_consequence') {
      if (currentBeat?.consequence?.mode === 'ai') { setAiGracePeriodDone(true); return; }
      if (consequenceEnteredAt === null) { setConsequenceEnteredAt(Date.now()); setAiGracePeriodDone(false); }
    } else {
      setConsequenceEnteredAt(null);
      setAiGracePeriodDone(false);
    }
  }, [storyState?.phase, currentBeat?.consequence?.mode]);

  useEffect(() => {
    if (storyState?.phase !== 'beat_consequence' || aiGracePeriodDone || consequenceEnteredAt === null) return;
    const remaining = AI_GRACE_MS - (Date.now() - consequenceEnteredAt);
    if (remaining <= 0) { setAiGracePeriodDone(true); return; }
    const timer = setTimeout(() => setAiGracePeriodDone(true), remaining);
    return () => clearTimeout(timer);
  }, [storyState?.phase, consequenceEnteredAt, aiGracePeriodDone]);

  // ── Handlers ──

  const handleAdvance = async () => {
    if (!storyState) return;
    if (storyState.phase !== 'beat_consequence' && storyState.phase !== 'roll_reveal') return;
    if (storyState.phase === 'beat_consequence' && !currentBeat?.consequence) return;
    if (advanceInFlightRef.current || advanceSubmitting) return;
    advanceInFlightRef.current = true;
    setAdvanceSubmitting(true);
    try {
      const res = await fetch(`/api/room/${roomId}/runtime/advance`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Could not continue yet.');
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ready: true }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Could not mark you as ready.'); }
      await loadRoom();
    } finally { setReadySubmitting(false); }
  };

  const handleSubmitAction = async () => {
    const trimmed = actionText.trim();
    if (!storyState || !trimmed) { if (!trimmed) alert('Write your action first.'); return; }
    if (!isSingleSentence(trimmed)) { alert('Use one short sentence only.'); return; }
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/room/${roomId}/runtime/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beat: storyState.currentBeat, actionText: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Could not send your action.');
      else setActionText('');
      await loadRoom();
    } finally { setActionSubmitting(false); }
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beat: storyState.currentBeat, value, band }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Could not save your roll.');
      const elapsed = Date.now() - animationStart;
      if (elapsed < ROLL_ANIMATION_MS) await new Promise((r) => setTimeout(r, ROLL_ANIMATION_MS - elapsed));
      setRollDisplayValue(value);
      await loadRoom();
    } finally { setRolling(false); setRollSubmitting(false); }
  };

  const handleCompleteStory = async () => {
    setCompleteSubmitting(true);
    try {
      const res = await fetch(`/api/room/${roomId}/complete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Could not finalize story yet.');
      await loadRoom();
    } finally { setCompleteSubmitting(false); }
  };

  // ── Render ──

  if (loading || !room || !storyState || !currentBeat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--quest-cream)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-200 border-t-amber-600 mx-auto mb-4" />
          <p className="text-stone-500 text-sm">{error ?? 'Loading room...'}</p>
        </div>
      </div>
    );
  }

  if (room.status === 'COMPLETED' && room.hasArtifact && room.artifactId) return null;
  if (room.status === 'COMPLETED' && !room.artifactId) {
    const allDone = players.length > 0 && players.every((p) => p.completedAt);
    return (
      <div className="min-h-screen bg-[var(--quest-cream)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-amber-100 shadow p-5 text-center">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {allDone ? 'Building your artifact…' : 'Waiting for everyone to finish'}
          </p>
          <p className="text-xs text-stone-500">
            {allDone
              ? 'This usually takes a few seconds. Keep this page open.'
              : 'Each player needs to tap "Finish story" on the final panel.'}
          </p>
        </div>
      </div>
    );
  }

  const rc = storyState.rollContinue;
  const myRollContinueAck = rc && rc.beat === storyState.currentBeat ? Boolean(rc.byPlayerId[myUserId]) : false;
  const rollContinueReady = rc && rc.beat === storyState.currentBeat ? Object.values(rc.byPlayerId).filter(Boolean).length : 0;
  const allRolled = Object.keys(currentBeat.rolls).length >= players.length;

  const cc = storyState.consequenceContinue;
  const myContinueAck = cc && cc.beat === storyState.currentBeat ? Boolean(cc.byPlayerId[myUserId]) : false;
  const continueReady = cc && cc.beat === storyState.currentBeat ? Object.values(cc.byPlayerId).filter(Boolean).length : 0;

  const finalSynthesisReady = storyState.finalSynthesis?.status === 'done' && Boolean(storyState.finalSynthesis?.text?.trim());

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

  return (
    <div className="min-h-screen bg-[var(--quest-cream)] pb-24">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-amber-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-800 font-display">{phaseTitle[storyState.phase]}</p>
          <p className="text-xs text-stone-500">{room.memberCount}/{room.maxPlayers} players</p>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {storyState.phase === 'waiting' && (
          <div className="bg-white rounded-3xl border border-amber-100 shadow p-5 text-center">
            <h1 className="text-lg font-bold text-gray-900 mb-2 font-display">Waiting for players</h1>
            <p className="text-sm text-stone-600">
              The room opens the briefing once enough players have joined ({room.memberCount}/{room.maxPlayers} here now).
            </p>
          </div>
        )}

        {storyState.phase === 'ready_check' && (
          <BriefingReady
            questName={room.questName}
            questDescription={room.questDescription}
            readyCount={readyCount}
            playerCount={players.length}
            myReady={Boolean(storyState.readyCheck.readyByPlayerId[myUserId])}
            readySubmitting={readySubmitting}
            onReady={handleReady}
          />
        )}

        {(storyState.phase === 'preamble' || storyState.phase === 'beat_input') && (
          <BeatInput
            currentBeat={storyState.currentBeat}
            totalBeats={storyState.totalBeats}
            currentMeta={currentMeta}
            mySubmittedAction={mySubmittedAction}
            actionText={actionText}
            actionSubmitting={actionSubmitting}
            submissionCount={Object.keys(currentBeat.submissions).length}
            playerCount={players.length}
            onActionTextChange={setActionText}
            onSubmitAction={handleSubmitAction}
          />
        )}

        {storyState.phase === 'roll_reveal' && (
          <RollReveal
            beat={currentBeat}
            players={players}
            myRoll={myRoll}
            rolling={rolling}
            rollSubmitting={rollSubmitting}
            rollDisplayValue={rollDisplayValue}
            allRolled={allRolled}
            myRollContinueAck={myRollContinueAck}
            rollContinueReady={rollContinueReady}
            advanceSubmitting={advanceSubmitting}
            onRoll={handleRoll}
            onAdvance={handleAdvance}
          />
        )}

        {storyState.phase === 'beat_consequence' && (
          <BeatConsequence
            beat={currentBeat}
            continueReady={continueReady}
            continueTotal={players.length}
            myContinueAck={myContinueAck}
            advanceSubmitting={advanceSubmitting}
            aiGracePeriodDone={aiGracePeriodDone}
            onAdvance={handleAdvance}
          />
        )}

        {storyState.phase === 'final_panel' && (
          <FinalPanel
            storyState={storyState}
            players={players}
            myUserId={myUserId}
            finalSynthesisReady={finalSynthesisReady}
            completeSubmitting={completeSubmitting}
            onComplete={handleCompleteStory}
          />
        )}

        {storyState.phase === 'completed' && (
          <div className="bg-white rounded-3xl border border-amber-100 shadow p-5 text-center">
            <h1 className="text-lg font-bold text-gray-900 mb-2 font-display">Wrapping up story</h1>
            <p className="text-sm text-stone-600">
              Finalizing your artifact and results. This page will update automatically.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
