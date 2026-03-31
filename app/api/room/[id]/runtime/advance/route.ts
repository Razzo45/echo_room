import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  computeScoreboard,
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
        const beatKey = String(beat) as '1' | '2' | '3';
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

        const deterministic = buildDeterministicBeatConsequence({
          beat,
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
        computeScoreboard(state, playerIds);

        if (beat === (state.totalBeats ?? 3)) {
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
      const beatKey = String(beat) as '1' | '2' | '3';
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

      const totalBeats = state.totalBeats ?? 3;
      if (beat < totalBeats) {
        state.currentBeat = (beat + 1) as 1 | 2 | 3;
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
      const { quest, members, beat: advancedBeat } = result as any;
      void (async () => {
        try {
          const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { members: { include: { user: true } } },
          });
          if (!room) return;
          const playerIds = room.members.map((m) => m.userId);
          const state = normalizeStoryState(room.storyState, playerIds);
          const bk = String(advancedBeat) as '1' | '2' | '3';
          const decision = quest.decisions?.find((d: any) => d.decisionNumber === advancedBeat);

          const aiResult = await generateBeatConsequenceWithFallback({
            beat: advancedBeat,
            beatTitle: decision?.title || `Beat ${advancedBeat}`,
            beatScene: decision?.context || '',
            paths: (decision?.options || []).map((o: any) => ({
              key: o.optionKey,
              label: o.title,
              summary: o.tradeoff || o.description || '',
            })),
            submissions: room.members.map((m) => ({
              name: m.user.name,
              text: state.beats[bk].submissions[m.userId] || '',
            })),
            rolls: room.members.map((m) => {
              const r = state.beats[bk].rolls[m.userId];
              return { name: m.user.name, value: r?.value ?? 0, band: r?.band ?? 'mixed' };
            }),
            averageRoll: (() => {
              const vals = Object.values(state.beats[bk].rolls).map((r) => r.value);
              return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            })(),
          });

          if (aiResult.mode === 'ai') {
            state.beats[bk].consequence = {
              text: aiResult.text,
              mode: aiResult.mode,
              generatedAt: new Date().toISOString(),
            };
          }

          if (advancedBeat === (state.totalBeats ?? 3)) {
            const synthesis = await generateFinalSynthesisWithFallback(
              state,
              room.members.map((m) => ({ id: m.userId, name: m.user.name }))
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
