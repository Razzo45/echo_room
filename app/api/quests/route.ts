import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/quests?regionId=xxx - Get quests for a region
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const regionName = searchParams.get('regionName'); // Alternative: find by name

    if (regionId) {
      const quests = await prisma.quest.findMany({
        where: {
          regionId,
          region: {
            eventId: user.eventId,
          },
          isActive: true,
        },
        include: {
          region: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });

      return NextResponse.json({
        quests: quests.map((q) => ({
          id: q.id,
          name: q.name,
          description: q.description,
          questType: q.questType,
          durationMinutes: q.durationMinutes,
          teamSize: q.teamSize,
          regionId: q.regionId,
          regionName: q.region.name,
        })),
      });
    }

    if (regionName) {
      // Find region by name for current event
      const region = await prisma.region.findFirst({
        where: {
          name: regionName,
          eventId: user.eventId,
        },
      });

      if (!region) {
        return NextResponse.json({ quests: [] });
      }

      const quests = await prisma.quest.findMany({
        where: {
          regionId: region.id,
          isActive: true,
        },
        include: {
          region: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });

      return NextResponse.json({
        quests: quests.map((q) => ({
          id: q.id,
          name: q.name,
          description: q.description,
          questType: q.questType,
          durationMinutes: q.durationMinutes,
          teamSize: q.teamSize,
          regionId: q.regionId,
          regionName: q.region.name,
        })),
      });
    }

    // Return all active quests for user's event
    const quests = await prisma.quest.findMany({
      where: {
        region: {
          eventId: user.eventId,
        },
        isActive: true,
      },
      include: {
        region: true,
      },
      orderBy: [
        { region: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
      ],
    });

    return NextResponse.json({
      quests: quests.map((q) => ({
        id: q.id,
        name: q.name,
        description: q.description,
        questType: q.questType,
        durationMinutes: q.durationMinutes,
        teamSize: q.teamSize,
        regionId: q.regionId,
        regionName: q.region.name,
      })),
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
