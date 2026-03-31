import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  isStoryStateColumnMissing,
  lockRoomForUpdate,
  normalizeStoryState,
  stripInternalStoryState,
} from '@/lib/story-runtime';

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
          data: {
            storyState: state,
            lastActivityAt: new Date(),
          },
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
        data: {
          storyState: state,
          lastActivityAt: new Date(),
        },
      });

      return {
        kind: 'ok' as const,
        advanced: true,
        continueAck: { ready: playerIds.length, total: playerIds.length },
        storyState: stripInternalStoryState(state),
      };
    });

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.error }, { status: result.status });
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
