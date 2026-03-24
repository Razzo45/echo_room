import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { runtimeActionSchema } from '@/lib/validation';
import {
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
    const validation = runtimeActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { beat, actionText } = validation.data;

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

      const state = normalizeStoryState(room.storyState, playerIds);
      if (state.currentBeat !== beat) {
        return { kind: 'error' as const, status: 409, error: `Current beat is ${state.currentBeat}` };
      }

      if (!['preamble', 'beat_input'].includes(state.phase)) {
        return { kind: 'error' as const, status: 409, error: `Cannot submit action during ${state.phase}` };
      }

      if (state.phase === 'preamble') {
        state.phase = 'beat_input';
      }

      const beatKey = String(beat) as '1' | '2' | '3';
      const existing = state.beats[beatKey].submissions[user.id];
      const now = new Date();
      if (existing) {
        return {
          kind: 'ok' as const,
          idempotent: true,
          actionText: existing,
          storyState: stripInternalStoryState(state),
        };
      }

      state.beats[beatKey].submissions[user.id] = actionText;
      const submissionCount = Object.keys(state.beats[beatKey].submissions).length;
      if (submissionCount === playerIds.length) {
        state.phase = 'roll_reveal';
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
        actionText,
        storyState: stripInternalStoryState(state),
      };
    });

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      idempotent: result.idempotent,
      actionText: result.actionText,
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
    console.error('Runtime action error:', error);
    return NextResponse.json(
      { error: 'An error occurred while submitting action' },
      { status: 500 }
    );
  }
}
