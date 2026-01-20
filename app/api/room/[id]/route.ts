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
    
    // Try to parse from deprecated decisionsData field first
    if (room.quest.decisionsData) {
      try {
        decisionsData = JSON.parse(room.quest.decisionsData);
      } catch (e) {
        console.error('Failed to parse decisionsData for quest', room.quest.id, e);
      }
    }
    
    // If decisionsData is missing or incomplete, build it from QuestDecision/QuestOption tables
    // Also rebuild if any decision is missing options A, B, or C
    const needsRebuild = !decisionsData || 
      !decisionsData.decisions || 
      decisionsData.decisions.length === 0 ||
      decisionsData.decisions.some((d: any) => !d.options || !d.options.A || !d.options.B || !d.options.C);
    
    if (needsRebuild) {
      const decisions = await prisma.questDecision.findMany({
        where: { questId: room.quest.id },
        include: {
          options: {
            orderBy: { optionKey: 'asc' },
          },
        },
        orderBy: { decisionNumber: 'asc' },
      });
      
      if (decisions.length > 0) {
        decisionsData = {
          decisions: decisions.map((d) => ({
            number: d.decisionNumber,
            title: d.title,
            description: d.context || d.title,
            options: d.options.reduce((acc, opt) => {
              acc[opt.optionKey as 'A' | 'B' | 'C'] = {
                label: opt.title,
                tradeoffs: opt.tradeoff || opt.description,
                risks: opt.impact ? opt.impact.split('. ').filter(Boolean) : [],
                outcomes: opt.impact ? opt.impact.split('. ').filter(Boolean) : [],
              };
              return acc;
            }, {} as Record<'A' | 'B' | 'C', any>),
          })),
        };
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
