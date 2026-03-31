import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { requireAdminAuth } from '@/lib/auth-organiser';
import { runtimeConsequenceSchema } from '@/lib/validation';
import {
  computeScoreboard,
  isStoryStateColumnMissing,
  lockRoomForUpdate,
  normalizeStoryState,
  stripInternalStoryState,
} from '@/lib/story-runtime';
import { generateFinalSynthesisWithFallback } from '@/lib/story-synthesis';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;

    const body = await request.json();
    const validation = runtimeConsequenceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { beat, text, mode, adminOverride } = validation.data;
    let canUseAdminOverride = false;
    const user = adminOverride ? null : await requireAuth();
    if (adminOverride) {
      try {
        await requireAdminAuth();
        canUseAdminOverride = true;
      } catch {
        return NextResponse.json({ error: 'Admin access required for override' }, { status: 403 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      await lockRoomForUpdate(tx, roomId);
      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: { members: { include: { user: true } } },
      });

      if (!room) {
        return { kind: 'error' as const, status: 404, error: 'Room not found' };
      }

      const playerIds = room.members.map((m) => m.userId);
      if (!canUseAdminOverride && (!user || !playerIds.includes(user.id))) {
        return { kind: 'error' as const, status: 403, error: 'Not a member of this room' };
      }

      const state = normalizeStoryState(room.storyState, playerIds);
      if (state.currentBeat !== beat) {
        return { kind: 'error' as const, status: 409, error: `Current beat is ${state.currentBeat}` };
      }
      if (!['roll_reveal', 'beat_consequence'].includes(state.phase)) {
        return { kind: 'error' as const, status: 409, error: `Cannot persist consequence during ${state.phase}` };
      }

      const beatKey = String(beat) as '1' | '2' | '3';
      const rollCount = Object.keys(state.beats[beatKey].rolls).length;
      if (rollCount !== playerIds.length && !canUseAdminOverride) {
        return { kind: 'error' as const, status: 409, error: 'All players must roll before consequence' };
      }

      if (state.beats[beatKey].consequence && !canUseAdminOverride) {
        return {
          kind: 'ok' as const,
          idempotent: true,
          consequence: state.beats[beatKey].consequence,
          storyState: stripInternalStoryState(state),
        };
      }

      const now = new Date();
      state.beats[beatKey].consequence = {
        text,
        mode,
        generatedAt: now.toISOString(),
      };
      state.beats[beatKey].resolved = true;
      state.internal = {
        ...(state.internal ?? {}),
        decisionCommitBeat: beat,
        decisionCommitAt: now.toISOString(),
      };

      computeScoreboard(state, playerIds);

      state.phase = 'beat_consequence';
      state.consequenceContinue = {
        beat,
        byPlayerId: Object.fromEntries(playerIds.map((id) => [id, false])),
      };
      if (beat === (state.totalBeats ?? 3)) {
        const synthesis = await generateFinalSynthesisWithFallback(
          state,
          room.members.map((member) => ({ id: member.userId, name: member.user.name }))
        );
        state.finalSynthesis = {
          status: 'done',
          text: synthesis.text,
          mode: synthesis.mode,
        };
      }

      await tx.room.update({
        where: { id: roomId },
        data: {
          storyState: state,
          lastActivityAt: now,
        },
      });

      return {
        kind: 'ok' as const,
        idempotent: false,
        consequence: state.beats[beatKey].consequence,
        storyState: stripInternalStoryState(state),
      };
    });

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      idempotent: result.idempotent,
      consequence: result.consequence,
      storyState: result.storyState,
    });
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
    console.error('Runtime consequence error:', error);
    return NextResponse.json(
      { error: 'An error occurred while persisting consequence' },
      { status: 500 }
    );
  }
}
