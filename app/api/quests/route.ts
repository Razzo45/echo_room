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

    // Build per-quest user status: prefer active rooms over past completions
    const questStatus = new Map<string, {
      roomId: string;
      status: string;
      currentBeat?: number;
      totalBeats?: number;
      artifactId?: string;
      hasCompleted: boolean;
      latestArtifactId: string | null;
    }>();

    // First pass: collect completion data per quest
    const questCompletions = new Map<string, { artifactId: string | null }>();
    for (const rm of userRooms) {
      if (rm.room.status === 'COMPLETED') {
        questCompletions.set(rm.room.questId, { artifactId: rm.room.artifact?.id ?? null });
      }
    }

    // Second pass: pick the best active room per quest (IN_PROGRESS > OPEN > COMPLETED)
    const STATUS_PRIORITY: Record<string, number> = { IN_PROGRESS: 3, OPEN: 2, FULL: 2, COMPLETED: 1 };
    for (const rm of userRooms) {
      const existing = questStatus.get(rm.room.questId);
      const incomingPriority = STATUS_PRIORITY[rm.room.status] ?? 0;
      const existingPriority = existing ? (STATUS_PRIORITY[existing.status] ?? 0) : -1;

      if (incomingPriority > existingPriority) {
        const ss = rm.room.storyState as {
          currentBeat?: number;
          totalBeats?: number;
          [key: string]: unknown;
        } | null;
        const completion = questCompletions.get(rm.room.questId);
        questStatus.set(rm.room.questId, {
          roomId: rm.room.id,
          status: rm.room.status,
          currentBeat: ss?.currentBeat,
          totalBeats: ss?.totalBeats ?? 5,
          artifactId: rm.room.artifact?.id,
          hasCompleted: !!completion,
          latestArtifactId: completion?.artifactId ?? null,
        });
      }
    }

    // Backfill hasCompleted/latestArtifactId for quests that only have COMPLETED rooms
    for (const [questId, entry] of questStatus) {
      const completion = questCompletions.get(questId);
      if (completion && !entry.hasCompleted) {
        entry.hasCompleted = true;
        entry.latestArtifactId = completion.artifactId;
      }
    }

    const completedCount = quests.filter((q) => questCompletions.has(q.id)).length;

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
