import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();

    const [event, regions, userRooms] = await Promise.all([
      prisma.event.findUnique({
        where: { id: user.eventId },
        select: { name: true, description: true, aiBrief: true },
      }),
      prisma.region.findMany({
        where: { eventId: user.eventId },
        orderBy: { sortOrder: 'asc' },
        include: {
          quests: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { id: true, name: true },
          },
        },
      }),
      prisma.roomMember.findMany({
        where: {
          userId: user.id,
          room: { quest: { region: { eventId: user.eventId } } },
        },
        include: {
          room: {
            select: {
              id: true,
              questId: true,
              status: true,
              storyState: true,
              quest: { select: { name: true, regionId: true } },
            },
          },
        },
      }),
    ]);

    const completedQuestIds = new Set<string>();
    let activeRoom: { roomId: string; questName: string; regionId: string; currentBeat: number; totalBeats: number } | null = null;

    for (const rm of userRooms) {
      if (rm.room.status === 'COMPLETED') {
        completedQuestIds.add(rm.room.questId);
      }
      if (rm.room.status === 'IN_PROGRESS' && !activeRoom) {
        const ss = rm.room.storyState as {
          currentBeat?: number;
          totalBeats?: number;
          [key: string]: unknown;
        } | null;
        activeRoom = {
          roomId: rm.room.id,
          questName: rm.room.quest.name,
          regionId: rm.room.quest.regionId,
          currentBeat: ss?.currentBeat ?? 1,
          totalBeats: ss?.totalBeats ?? 5,
        };
      }
    }

    const regionData = regions.map((r) => {
      const questIds = r.quests.map((q) => q.id);
      const completed = questIds.filter((id) => completedQuestIds.has(id)).length;
      const nextQuest = r.quests.find((q) => !completedQuestIds.has(q.id));
      return {
        id: r.id,
        name: r.name,
        displayName: r.displayName,
        description: r.description,
        isActive: r.isActive,
        questCount: r.quests.length,
        completed,
        nextQuestName: nextQuest?.name ?? null,
      };
    });

    return NextResponse.json({
      event: event ? { name: event.name, description: event.description || event.aiBrief || null } : null,
      regions: regionData,
      activeRoom,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get regions error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
