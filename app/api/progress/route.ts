import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/progress
 * Event-level and region-level progress for the current user (computed).
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const eventId = user.eventId;

    const [event, regionsWithQuests, completedRoomQuests] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        select: { name: true },
      }),
      prisma.region.findMany({
        where: { eventId },
        orderBy: { sortOrder: 'asc' },
        include: {
          quests: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      }),
      prisma.roomMember.findMany({
        where: {
          userId: user.id,
          room: {
            status: 'COMPLETED',
            quest: { isActive: true },
          },
        },
        include: {
          room: { select: { questId: true } },
        },
      }),
    ]);

    const completedQuestIds = new Set(
      completedRoomQuests.map((m) => m.room.questId)
    );

    let totalQuests = 0;
    const regionProgress = regionsWithQuests.map((r) => {
      const questIds = r.quests.map((q) => q.id);
      const completed = questIds.filter((id) => completedQuestIds.has(id)).length;
      totalQuests += questIds.length;
      return {
        id: r.id,
        displayName: r.displayName,
        name: r.name,
        completed,
        total: questIds.length,
        percentage: questIds.length ? Math.round((100 * completed) / questIds.length) : 0,
      };
    });

    const completedTotal = completedQuestIds.size;

    return NextResponse.json({
      eventName: event?.name ?? 'This event',
      eventProgress: {
        completed: completedTotal,
        total: totalQuests,
      },
      regions: regionProgress,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Progress error:', error);
    return NextResponse.json(
      { error: 'Failed to load progress' },
      { status: 500 }
    );
  }
}
