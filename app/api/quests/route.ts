import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/quests?regionId=xxx  — quests for a region with per-quest user status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const regionName = searchParams.get('regionName');

    let resolvedRegionId = regionId;

    if (!resolvedRegionId && regionName) {
      const region = await prisma.region.findFirst({
        where: { name: regionName, eventId: user.eventId },
      });
      if (!region) return NextResponse.json({ quests: [], region: null });
      resolvedRegionId = region.id;
    }

    const whereClause = resolvedRegionId
      ? { regionId: resolvedRegionId, region: { eventId: user.eventId }, isActive: true }
      : { region: { eventId: user.eventId }, isActive: true };

    const orderBy = resolvedRegionId
      ? { sortOrder: 'asc' as const }
      : [{ region: { sortOrder: 'asc' as const } }, { sortOrder: 'asc' as const }];

    const [quests, region, userRooms] = await Promise.all([
      prisma.quest.findMany({
        where: whereClause,
        include: { region: true },
        orderBy,
      }),
      resolvedRegionId
        ? prisma.region.findUnique({
            where: { id: resolvedRegionId },
            select: { id: true, displayName: true, name: true, description: true },
          })
        : Promise.resolve(null),
      prisma.roomMember.findMany({
        where: {
          userId: user.id,
          room: {
            quest: resolvedRegionId
              ? { regionId: resolvedRegionId }
              : { region: { eventId: user.eventId } },
          },
        },
        include: {
          room: {
            select: {
              id: true,
              questId: true,
              status: true,
              storyState: true,
              artifact: { select: { id: true } },
            },
          },
        },
      }),
    ]);

    // Build per-quest user status lookup (most recent room per quest wins)
    const questStatus = new Map<string, {
      roomId: string;
      status: string;
      currentBeat?: number;
      totalBeats?: number;
      artifactId?: string;
    }>();

    for (const rm of userRooms) {
      const existing = questStatus.get(rm.room.questId);
      // Prefer COMPLETED, then IN_PROGRESS, then any
      if (!existing || rm.room.status === 'COMPLETED' || (rm.room.status === 'IN_PROGRESS' && existing.status !== 'COMPLETED')) {
        const ss = rm.room.storyState as any;
        questStatus.set(rm.room.questId, {
          roomId: rm.room.id,
          status: rm.room.status,
          currentBeat: ss?.currentBeat,
          totalBeats: ss?.totalBeats ?? 5,
          artifactId: rm.room.artifact?.id,
        });
      }
    }

    const completedCount = quests.filter((q) => questStatus.get(q.id)?.status === 'COMPLETED').length;

    return NextResponse.json({
      region: region ? {
        id: region.id,
        displayName: region.displayName,
        name: region.name,
        description: region.description,
        questCount: quests.length,
        completed: completedCount,
      } : null,
      quests: quests.map((q) => {
        const qs = questStatus.get(q.id) ?? null;
        return {
          id: q.id,
          name: q.name,
          description: q.description,
          questType: q.questType,
          durationMinutes: q.durationMinutes,
          regionId: q.regionId,
          regionName: q.region.displayName || q.region.name,
          userStatus: qs,
        };
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get quests error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
