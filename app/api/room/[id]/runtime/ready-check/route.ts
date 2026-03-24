import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { runtimeReadyCheckSchema } from '@/lib/validation';
import {
  isStoryStateColumnMissing,
  lockRoomForUpdate,
  normalizeStoryState,
  stripInternalStoryState,
} from '@/lib/story-runtime';

const READY_CHECK_DURATION_MS = 60_000;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const roomId = params.id;

    const body = await request.json();
    const validation = runtimeReadyCheckSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await lockRoomForUpdate(tx, roomId);
      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: { members: true },
      });

      if (!room) {
        return { kind: 'error' as const, status: 404, error: 'Room not found' };
      }

      const playerIds = room.members.map((m) => m.userId);
      if (!playerIds.includes(user.id)) {
        return { kind: 'error' as const, status: 403, error: 'Not a member of this room' };
      }

      const now = new Date();
      const state = normalizeStoryState(room.storyState, playerIds);

      if (state.phase === 'waiting' || state.phase === 'room_full') {
        state.phase = 'ready_check';
      }

      if (!state.readyCheck.startedAt) {
        state.readyCheck.startedAt = now.toISOString();
      }
      if (!state.readyCheck.deadlineAt) {
        state.readyCheck.deadlineAt = new Date(now.getTime() + READY_CHECK_DURATION_MS).toISOString();
      }

      state.readyCheck.readyByPlayerId[user.id] = validation.data.ready;

      const allReady = playerIds.length > 0 && playerIds.every((id) => state.readyCheck.readyByPlayerId[id]);
      if (allReady) {
        state.phase = 'preamble';
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
        storyState: stripInternalStoryState(state),
        allReady,
      };
    });

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      allReady: result.allReady,
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
    console.error('Ready check error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating ready-check' },
      { status: 500 }
    );
  }
}
