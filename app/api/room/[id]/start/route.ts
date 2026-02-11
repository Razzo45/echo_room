import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const roomId = params.id;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        _count: {
          select: { members: true },
        },
        members: true,
        quest: {
          select: {
            teamSize: true,
            minTeamSize: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if user is a member
    const isMember = room.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: 'Not a member of this room' },
        { status: 403 }
      );
    }

    // Check if room can be started
    if (room.status === 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Room already in progress' },
        { status: 400 }
      );
    }

    if (room.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Room already completed' },
        { status: 400 }
      );
    }

    // Admin can force start; otherwise need minTeamSize members (defaults to 2)
    const body = await request.json();
    const isAdminOverride = body.adminOverride === true;

    const minTeamSize = room.quest.minTeamSize ?? 2;

    if (!isAdminOverride && room._count.members < minTeamSize) {
      return NextResponse.json(
        { error: `Need at least ${minTeamSize} member(s) to start quest` },
        { status: 400 }
      );
    }

    // Start the room
    await prisma.room.update({
      where: { id: roomId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Quest started',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Start room error:', error);
    return NextResponse.json(
      { error: 'An error occurred while starting quest' },
      { status: 500 }
    );
  }
}
