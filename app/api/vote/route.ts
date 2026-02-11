import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { voteSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const validation = voteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { roomId, decisionNumber, optionKey, justification } = validation.data;

    // Verify room exists and user is a member
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: true,
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

    // Check if decision already committed
    const isCommitted = room.commits.some((c) => c.decisionNumber === decisionNumber);
    if (isCommitted) {
      return NextResponse.json(
        { error: 'Decision already committed' },
        { status: 400 }
      );
    }

    // Create or update vote
    await prisma.vote.upsert({
      where: {
        roomId_userId_decisionNumber: {
          roomId,
          userId: user.id,
          decisionNumber,
        },
      },
      update: {
        optionKey,
        justification,
      },
      create: {
        roomId,
        userId: user.id,
        decisionNumber,
        optionKey,
        justification,
      },
    });

    await prisma.room.update({
      where: { id: roomId },
      data: { lastActivityAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'Vote recorded',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'An error occurred while recording vote' },
      { status: 500 }
    );
  }
}
