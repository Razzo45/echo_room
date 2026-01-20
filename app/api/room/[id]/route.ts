import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const roomId = params.id;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        quest: true,
        members: {
          include: {
            user: true,
          },
        },
        votes: {
          include: {
            user: true,
          },
        },
        commits: {
          orderBy: {
            decisionNumber: 'asc',
          },
        },
        artifact: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // For DECISION_ROOM quests we expect structured decisionsData JSON.
    // For other quest types (FORM, SURVEY), this may be null.
    let decisionsData: any = null;
    if (room.quest.decisionsData) {
      try {
        decisionsData = JSON.parse(room.quest.decisionsData);
      } catch (e) {
        console.error('Failed to parse decisionsData for quest', room.quest.id, e);
      }
    }

    // Check if user is a member
    const isMember = room.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
    }

    return NextResponse.json({
      room: {
        id: room.id,
        roomCode: room.roomCode,
        status: room.status,
        currentDecision: room.currentDecision,
        questName: room.quest.name,
        questDescription: room.quest.description,
        questDuration: room.quest.durationMinutes,
        decisionsData,
        members: room.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          organisation: m.user.organisation,
          role: m.user.role,
        })),
        votes: room.votes.map((v) => ({
          userId: v.userId,
          userName: v.user.name,
          decisionNumber: v.decisionNumber,
          optionKey: v.optionKey,
          justification: v.justification,
        })),
        commits: room.commits.map((c) => ({
          decisionNumber: c.decisionNumber,
          committedOption: c.committedOption,
        })),
        hasArtifact: !!room.artifact,
        artifactId: room.artifact?.id,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get room error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
