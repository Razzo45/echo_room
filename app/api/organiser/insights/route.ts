import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

/**
 * GET /api/organiser/insights?eventId=xxx
 * Data exploration for organisers: participants, room compositions, badge stats, artifacts.
 * Event must belong to the current organiser (or organiser is SUPER_ADMIN).
 */
export async function GET(request: NextRequest) {
  try {
    const organiser = await requireOrganiserAuth();

    const eventId = request.nextUrl.searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId query parameter is required' },
        { status: 400 }
      );
    }

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        ...(organiser.role === 'SUPER_ADMIN'
          ? {}
          : { organiserId: organiser.id }),
      },
      select: { id: true, name: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const [participants, roomsWithMembers, artifactList, badgeStats] = await Promise.all([
      prisma.user.findMany({
        where: { eventId },
        select: {
          id: true,
          name: true,
          organisation: true,
          role: true,
          country: true,
          skill: true,
          curiosity: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.room.findMany({
        where: { eventId },
        include: {
          quest: { select: { name: true } },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  organisation: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.artifact.findMany({
        where: { room: { eventId } },
        include: {
          room: {
            select: {
              id: true,
              roomCode: true,
              quest: { select: { name: true } },
              completedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userBadge.groupBy({
        by: ['badgeId'],
        where: {
          user: { eventId },
        },
        _count: { id: true },
      }),
    ]);

    const badgeIds = [...new Set(badgeStats.map((b) => b.badgeId))];
    const badges = await prisma.badge.findMany({
      where: { id: { in: badgeIds } },
      select: { id: true, badgeType: true, name: true, icon: true, rarity: true },
    });
    const badgeMap = new Map(badges.map((b) => [b.id, b]));
    const badgeStatsWithNames = badgeStats.map((s) => ({
      badgeType: badgeMap.get(s.badgeId)?.badgeType ?? 'UNKNOWN',
      name: badgeMap.get(s.badgeId)?.name ?? 'Unknown',
      icon: badgeMap.get(s.badgeId)?.icon ?? '🏅',
      rarity: badgeMap.get(s.badgeId)?.rarity ?? 'common',
      count: s._count.id,
    }));

    return NextResponse.json({
      event: { id: event.id, name: event.name },
      participants,
      rooms: roomsWithMembers.map((r) => ({
        id: r.id,
        roomCode: r.roomCode,
        status: r.status,
        questName: r.quest.name,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        members: r.members.map((m) => ({
          userId: m.user.id,
          name: m.user.name,
          organisation: m.user.organisation,
          role: m.user.role,
        })),
      })),
      artifacts: artifactList.map((a) => ({
        id: a.id,
        roomId: a.room.id,
        roomCode: a.room.roomCode,
        questName: a.room.quest.name,
        completedAt: a.room.completedAt,
        createdAt: a.createdAt,
      })),
      badgeStats: badgeStatsWithNames,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Organiser authentication required'
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Organiser insights error:', error);
    return NextResponse.json(
      { error: 'Failed to load insights' },
      { status: 500 }
    );
  }
}
