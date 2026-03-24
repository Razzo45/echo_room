import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { requireAdminAuth } from '@/lib/auth-organiser';
import {
  createInitialStoryState,
  isStoryStateColumnMissing,
  lockRoomForUpdate,
  normalizeStoryState,
} from '@/lib/story-runtime';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;

    // Admin can force start; otherwise need minTeamSize members (defaults to 2)
    const body = await request.json();
    const isAdminOverride = body.adminOverride === true;
    const user = isAdminOverride ? null : await requireAuth();
    if (isAdminOverride) {
      try {
        await requireAdminAuth();
      } catch {
        return NextResponse.json({ error: 'Admin access required for override' }, { status: 403 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      await lockRoomForUpdate(tx, roomId);
      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: {
          _count: {
            select: { members: true },
          },
          members: true,
          quest: {
            select: {
              minTeamSize: true,
            },
          },
        },
      });

      if (!room) {
        return { kind: 'error' as const, status: 404, error: 'Room not found' };
      }

      const isMember = !!user && room.members.some((m) => m.userId === user.id);
      if (!isMember && !isAdminOverride) {
        return { kind: 'error' as const, status: 403, error: 'Not a member of this room' };
      }

      if (room.status === 'IN_PROGRESS') {
        return { kind: 'error' as const, status: 400, error: 'Room already in progress' };
      }

      if (room.status === 'COMPLETED') {
        return { kind: 'error' as const, status: 400, error: 'Room already completed' };
      }

      const minTeamSize = room.quest.minTeamSize ?? 2;
      if (!isAdminOverride && room._count.members < minTeamSize) {
        return {
          kind: 'error' as const,
          status: 400,
          error: `Need at least ${minTeamSize} member(s) to start quest`,
        };
      }

      const now = new Date();
      const memberIds = room.members.map((m) => m.userId);
      const storyState = room.storyState
        ? normalizeStoryState(room.storyState, memberIds)
        : createInitialStoryState(memberIds);
      if (storyState.phase === 'waiting' || storyState.phase === 'room_full') {
        storyState.phase = 'ready_check';
        storyState.readyCheck.startedAt = now.toISOString();
        storyState.readyCheck.deadlineAt = new Date(now.getTime() + 60_000).toISOString();
      }

      await tx.room.update({
        where: { id: roomId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: now,
          storyState,
          lastActivityAt: now,
        },
      });

      return { kind: 'ok' as const };
    });

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Quest started',
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
    console.error('Start room error:', error);
    return NextResponse.json(
      { error: 'An error occurred while starting quest' },
      { status: 500 }
    );
  }
}
