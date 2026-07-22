import { NextRequest, NextResponse } from 'next/server';
import type { Event, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { BeatKey, BeatNumber } from '@/lib/story-runtime';
import {
  isStoryStateColumnMissing,
  lockRoomForUpdate,
  normalizeStoryState,
  stripInternalStoryState,
} from '@/lib/story-runtime';
import {
  buildDeterministicBeatConsequence,
  generateBeatConsequenceWithFallback,
  generateFinalSynthesisWithFallback,
} from '@/lib/story-synthesis';
import { adaptNextBeatScene } from '@/lib/ai/adaptNextBeat';
import { normalizeScenarioSlots } from '@/lib/ai/scenarioSlots';

/** Transaction branch that advanced to beat_consequence with full room context for post-tx AI. */
type AdvanceBeatConsequenceOk = {
  kind: 'ok';
  advanced: true;
  phase: 'beat_consequence';
  beat: BeatNumber;
  continueAck: { ready: number; total: number };
  storyState: ReturnType<typeof stripInternalStoryState>;
  quest: Prisma.QuestGetPayload<{
    include: {
      decisions: { include: { options: true } };
    };
  }>;
  event: Event | null;
  members: Prisma.RoomMemberGetPayload<{ include: { user: true } }>[];
};

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const roomId = params.id;

    const result = await prisma.$transaction(async (tx) => {
      await lockRoomForUpdate(tx, roomId);
      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: {
          event: true,
          members: { include: { user: true } },
          quest: {
            include: {
              decisions: {
                orderBy: { decisionNumber: 'asc' },
                include: { options: { orderBy: { optionKey: 'asc' } } },
              },
            },
          },
        },
      });

      if (!room) {
        return { kind: 'error' as const, status: 404, error: 'Room not found' };
      }

      const playerIds = room.members.map((m) => m.userId);
      if (!playerIds.includes(user.id)) {
        return { kind: 'error' as const, status: 403, error: 'Not a member of this room' };
      }

      const state = normalizeStoryState(room.storyState, playerIds);

      // --- Roll-reveal continue: everyone saw their rolls, now advance to beat_consequence ---
      if (state.phase === 'roll_reveal') {
        const beat = state.currentBeat;
        const beatKey = String(beat) as BeatKey;
        const allRolled = Object.keys(state.beats[beatKey].rolls).length >= playerIds.length;
        if (!allRolled) {
          return { kind: 'error' as const, status: 409, error: 'Not all players have rolled yet' };
        }

        if (!state.rollContinue || state.rollContinue.beat !== beat) {
          state.rollContinue = {
            beat,
            byPlayerId: Object.fromEntries(playerIds.map((id) => [id, false])),
          };
        }
        for (const id of playerIds) {
          if (!(id in state.rollContinue.byPlayerId)) {
            state.rollContinue.byPlayerId[id] = false;
          }
        }
        state.rollContinue.byPlayerId[user.id] = true;
        const continueReady = playerIds.filter((id) => state.rollContinue!.byPlayerId[id]).length;
        const allReady = playerIds.every((id) => state.rollContinue!.byPlayerId[id]);

        if (!allReady) {
          await tx.room.update({
            where: { id: roomId },
            data: { storyState: state, lastActivityAt: new Date() },
          });
          return {
            kind: 'ok' as const,
            advanced: false,
            continueAck: { ready: continueReady, total: playerIds.length },
            storyState: stripInternalStoryState(state),
          };
        }

        // All players ready — generate consequence and transition.
        state.rollContinue = null;
        state.phase = 'beat_consequence';

        const submissionList = room.members.map((m) => ({
          name: m.user.name,
          text: state.beats[beatKey].submissions[m.userId] || 'support the team plan',
        }));
        const rollValues = Object.values(state.beats[beatKey].rolls).map((r) => r.value);
        const averageRoll = rollValues.length
          ? rollValues.reduce((sum, v) => sum + v, 0) / rollValues.length
          : 0;
        const rollList = room.members.map((m) => {
          const r = state.beats[beatKey].rolls[m.userId];
          return { name: m.user.name, value: r?.value ?? 0, band: r?.band ?? 'mixed' };
        });

        const decisionForBeat = room.quest.decisions?.find((d) => d.decisionNumber === beat);
        const adapted = state.adaptedScenes?.[beatKey];
        const beatScene =
          adapted?.context || decisionForBeat?.context || '';

        const deterministic = buildDeterministicBeatConsequence({
          beat,
          beatScene,
          submissions: submissionList,
          rolls: rollList,
          averageRoll,
        });
        state.beats[beatKey].consequence = {
          text: deterministic.text,
          mode: deterministic.mode,
          generatedAt: new Date().toISOString(),
        };

        state.beats[beatKey].resolved = true;
        state.consequenceContinue = {
          beat,
          byPlayerId: Object.fromEntries(playerIds.map((id) => [id, false])),
        };
        if (beat === (state.totalBeats ?? 5)) {
          state.finalSynthesis = { status: 'pending', text: '', mode: 'queued_after_advance' };
        }

        await tx.room.update({
          where: { id: roomId },
          data: { storyState: state, lastActivityAt: new Date() },
        });

        return {
          kind: 'ok' as const,
          advanced: true,
          phase: 'beat_consequence' as const,
          beat,
          continueAck: { ready: playerIds.length, total: playerIds.length },
          storyState: stripInternalStoryState(state),
          quest: room.quest,
          event: room.event,
          members: room.members,
        };
      }

      // --- Beat-consequence continue: advance to next beat or final panel ---
      if (state.phase !== 'beat_consequence') {
        return {
          kind: 'ok' as const,
          advanced: false,
          storyState: stripInternalStoryState(state),
        };
      }

      const beat = state.currentBeat;
      const beatKey = String(beat) as BeatKey;
      if (!state.beats[beatKey].consequence) {
        return { kind: 'error' as const, status: 409, error: 'Consequence is not ready yet' };
      }

      if (!state.consequenceContinue || state.consequenceContinue.beat !== beat) {
        state.consequenceContinue = {
          beat,
          byPlayerId: Object.fromEntries(playerIds.map((id) => [id, false])),
        };
      }
      for (const id of playerIds) {
        if (!(id in state.consequenceContinue.byPlayerId)) {
          state.consequenceContinue.byPlayerId[id] = false;
        }
      }
      state.consequenceContinue.byPlayerId[user.id] = true;
      const continueReady = playerIds.filter((id) => state.consequenceContinue!.byPlayerId[id]).length;
      const allContinueReady = playerIds.every((id) => state.consequenceContinue!.byPlayerId[id]);

      if (!allContinueReady) {
        await tx.room.update({
          where: { id: roomId },
          data: { storyState: state, lastActivityAt: new Date() },
        });
        return {
          kind: 'ok' as const,
          advanced: false,
          continueAck: { ready: continueReady, total: playerIds.length },
          storyState: stripInternalStoryState(state),
        };
      }

      state.consequenceContinue = null;

      const totalBeats = state.totalBeats ?? 5;
      if (beat < totalBeats) {
        state.currentBeat = (beat + 1) as BeatNumber;
        state.phase = 'beat_input';
      } else {
        state.phase = 'final_panel';
      }

      await tx.room.update({
        where: { id: roomId },
        data: { storyState: state, lastActivityAt: new Date() },
      });

      return {
        kind: 'ok' as const,
        advanced: true,
        continueAck: { ready: playerIds.length, total: playerIds.length },
        storyState: stripInternalStoryState(state),
      };
    }, { maxWait: 5000, timeout: 15000 });

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Best-effort AI upgrade for beat consequence (runs after transaction).
    if ('phase' in result && result.phase === 'beat_consequence' && 'quest' in result && 'beat' in result) {
      const { quest, event: txEvent, members, beat: advancedBeat } = result as AdvanceBeatConsequenceOk;
      const scenarioName = quest.name || 'Collaborative Scenario';
      const scenarioDescription = quest.description || txEvent?.aiBrief || '';
      const slots = normalizeScenarioSlots(txEvent?.aiScenarioSlots);
      void (async () => {
        try {
          const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { members: { include: { user: true } } },
          });
          if (!room) return;
          const playerIds = room.members.map((m) => m.userId);
          const state = normalizeStoryState(room.storyState, playerIds);
          const bk = String(advancedBeat) as BeatKey;
          const decision = quest.decisions?.find((d) => d.decisionNumber === advancedBeat);
          const adaptedScene = state.adaptedScenes?.[bk];
          const beatScene = adaptedScene?.context || decision?.context || '';
          const priorKey = advancedBeat > 1 ? (String(advancedBeat - 1) as BeatKey) : null;
          const priorConsequence = priorKey
            ? state.beats[priorKey]?.consequence?.text || null
            : null;

          const averageRoll = (() => {
            const vals = Object.values(state.beats[bk].rolls).map((r) => r.value);
            return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          })();

          const submissions = room.members.map((m) => ({
            name: m.user.name,
            text: state.beats[bk].submissions[m.userId] || '',
          }));

          const aiResult = await generateBeatConsequenceWithFallback({
            beat: advancedBeat,
            beatTitle: adaptedScene?.title || decision?.title || `Beat ${advancedBeat}`,
            beatScene,
            scenarioName,
            scenarioDescription,
            slots,
            priorConsequence,
            paths: (decision?.options || []).map((o) => ({
              key: o.optionKey,
              label: o.title,
              summary: o.description || o.tradeoff || '',
              impact: o.impact || '',
            })),
            submissions,
            rolls: room.members.map((m) => {
              const r = state.beats[bk].rolls[m.userId];
              return { name: m.user.name, value: r?.value ?? 0, band: r?.band ?? 'mixed' };
            }),
            averageRoll,
          });

          if (aiResult.mode === 'ai') {
            state.beats[bk].consequence = {
              text: aiResult.text,
              mode: aiResult.mode,
              generatedAt: new Date().toISOString(),
            };
          }

          const consequenceText = state.beats[bk].consequence?.text || '';
          const totalBeats = state.totalBeats ?? 5;

          // Adapt the next beat scene so the story reacts (mini) — fail-open.
          if (advancedBeat < totalBeats && consequenceText) {
            const nextBeat = (advancedBeat + 1) as BeatNumber;
            const nextKey = String(nextBeat) as BeatKey;
            const nextDecision = quest.decisions?.find((d) => d.decisionNumber === nextBeat);
            const adapted = await adaptNextBeatScene({
              scenarioName,
              scenarioDescription,
              slots,
              completedBeat: advancedBeat,
              completedBeatTitle: decision?.title || `Beat ${advancedBeat}`,
              consequenceText,
              submissions,
              averageRoll,
              nextBeatNumber: nextBeat,
              nextBeatTitle: nextDecision?.title || `Beat ${nextBeat}`,
              nextBeatScene: nextDecision?.context || '',
            });
            if (adapted?.context) {
              state.adaptedScenes = {
                ...(state.adaptedScenes || {}),
                [nextKey]: {
                  title: adapted.title,
                  context: adapted.context,
                  adaptedAt: new Date().toISOString(),
                  fromBeat: advancedBeat,
                },
              };
            }
          }

          if (advancedBeat === totalBeats) {
            const synthesis = await generateFinalSynthesisWithFallback(
              state,
              room.members.map((m) => ({ id: m.userId, name: m.user.name })),
              { name: scenarioName, description: scenarioDescription, slots }
            );
            state.finalSynthesis = { status: 'done', text: synthesis.text, mode: synthesis.mode };
          }

          await prisma.room.update({
            where: { id: roomId },
            data: { storyState: state, lastActivityAt: new Date() },
          });
        } catch (e) {
          console.error('Post-advance AI upgrade failed (non-blocking):', e);
        }
      })();
    }

    const body: Record<string, unknown> = {
      success: true,
      advanced: result.advanced,
      storyState: result.storyState,
    };
    if ('continueAck' in result && result.continueAck) {
      body.continueAck = result.continueAck;
    }
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isStoryStateColumnMissing(error)) {
      return NextResponse.json(
        { error: 'Runtime state migration is pending. Please run database migrations and retry.' },
        { status: 503 }
      );
    }
    console.error('Runtime advance error:', error);
    return NextResponse.json(
      { error: 'An error occurred while advancing story state' },
      { status: 500 }
    );
  }
}
