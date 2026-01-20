import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { commitSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const validation = commitSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { roomId, decisionNumber, optionKey } = validation.data;

    // Verify room and membership
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: true,
        votes: {
          where: { decisionNumber },
        },
        commits: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isMember = room.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: 'Not a member of this room' },
        { status: 403 }
      );
    }

    if (room.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Room is not in progress' },
        { status: 400 }
      );
    }

    // Check if already committed
    const existingCommit = room.commits.find((c) => c.decisionNumber === decisionNumber);
    if (existingCommit) {
      return NextResponse.json(
        { error: 'Decision already committed' },
        { status: 400 }
      );
    }

    // Optional: Verify all members have voted (can be relaxed for MVP)
    const allMembersVoted = room.members.length === room.votes.length;
    if (!allMembersVoted) {
      console.warn(`Not all members voted for decision ${decisionNumber} in room ${roomId}`);
    }

    // Create commit
    await prisma.decisionCommit.create({
      data: {
        roomId,
        decisionNumber,
        committedOption: optionKey,
      },
    });

    // If this was decision 3, mark room as completed
    if (decisionNumber === 3) {
      await prisma.room.update({
        where: { id: roomId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Award badges for room completion (async, don't block response)
      import('@/lib/badges').then(({ checkRoomCompletionBadges }) => {
        checkRoomCompletionBadges(roomId).catch((err) => {
          console.error('Error checking badges:', err);
        });
      });
    } else {
      // Move to next decision
      await prisma.room.update({
        where: { id: roomId },
        data: {
          currentDecision: decisionNumber + 1,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Decision committed',
      isComplete: decisionNumber === 3,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Commit error:', error);
    return NextResponse.json(
      { error: 'An error occurred while committing decision' },
      { status: 500 }
    );
  }
}
