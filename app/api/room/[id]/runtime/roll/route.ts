import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { runtimeRollSchema } from '@/lib/validation';
import {
  computeScoreboard,
  isStoryStateColumnMissing,
  lockRoomForUpdate,
  normalizeStoryState,
  stripInternalStoryState,
} from '@/lib/story-runtime';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const roomId = params.id;

    const body = await request.json();
    const validation = runtimeRollSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { beat, value, band } = validation.data;

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
      if (state.currentBeat !== beat) {
        return { kind: 'error' as const, status: 409, error: `Current beat is ${state.currentBeat}` };
      }
      if (state.phase !== 'roll_reveal') {
        return { kind: 'error' as const, status: 409, error: `Cannot roll during ${state.phase}` };
      }

      const beatKey = String(beat) as '1' | '2' | '3';
      const existing = state.beats[beatKey].rolls[user.id];
      if (existing) {
        return {
          kind: 'ok' as const,
          idempotent: true,
          roll: existing,
          storyState: stripInternalStoryState(state),
        };
      }

      const now = new Date();
      const roll = { value, band, rolledAt: now.toISOString() };
      state.beats[beatKey].rolls[user.id] = roll;
      const rollCount = Object.keys(state.beats[beatKey].rolls).length;
      if (rollCount === playerIds.length) {
        state.beats[beatKey].revealed = true;
        // Stay in roll_reveal so everyone can see the results.
        // Transition to beat_consequence happens when all players click "Continue" via /advance.
        state.rollContinue = {
          beat,
          byPlayerId: Object.fromEntries(playerIds.map((id) => [id, false])),
        };
        computeScoreboard(state, playerIds);
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
        roll,
        storyState: stripInternalStoryState(state),
      };
    }, { maxWait: 5000, timeout: 15000 });

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      idempotent: result.idempotent,
      roll: result.roll,
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
    console.error('Runtime roll error:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error';
    return NextResponse.json(
      { error: `ROLL_RUNTIME_ERROR: ${message}` },
      { status: 500 }
    );
  }
}
