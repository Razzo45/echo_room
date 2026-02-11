import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();

    const roomMemberships = await prisma.roomMember.findMany({
      where: { userId: user.id },
      include: {
        room: {
          include: {
            quest: true,
            artifact: true,
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    const rooms = roomMemberships.map((membership) => ({
      id: membership.room.id,
      roomCode: membership.room.roomCode,
      status: membership.room.status,
      questName: membership.room.quest.name,
      memberCount: membership.room._count.members,
      maxPlayers: membership.room.quest.teamSize,
      joinedAt: membership.joinedAt,
      completedAt: membership.room.completedAt,
      hasArtifact: !!membership.room.artifact,
      artifactId: membership.room.artifact?.id,
    }));

    return NextResponse.json({ rooms });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get user rooms error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
