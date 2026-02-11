import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { requireOrganiserDistrictAccess } from '@/lib/event-access';

// GET /api/organiser/quests?eventId=xxx or ?districtId=xxx
export async function GET(request: Request) {
  try {
    const organiser = await requireOrganiserAuth();

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const districtId = searchParams.get('districtId');

    let quests;

    if (districtId) {
      quests = await prisma.quest.findMany({
        where: {
          regionId: districtId,
          region: {
            event: organiser.role === 'SUPER_ADMIN'
              ? {}
              : { organiserId: organiser.id },
          },
        },
        include: {
          region: true,
          decisions: {
            include: {
              options: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
          fields: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: { rooms: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });
    } else if (eventId) {
      quests = await prisma.quest.findMany({
        where: {
          region: {
            eventId,
            event: organiser.role === 'SUPER_ADMIN'
              ? {}
              : { organiserId: organiser.id },
          },
        },
        include: {
          region: true,
          _count: {
            select: {
              rooms: true,
              decisions: true,
              fields: true,
            },
          },
        },
        orderBy: [{ region: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      });
    } else {
      return NextResponse.json(
        { error: 'Event ID or District ID is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ quests });
  } catch (error: any) {
    if (error?.status === 404) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Get quests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quests' },
      { status: 500 }
    );
  }
}

// POST /api/organiser/quests
export async function POST(request: Request) {
  try {
    const organiser = await requireOrganiserAuth();

    const body = await request.json();
    const {
      regionId,
      name,
      description,
      questType,
      durationMinutes,
      teamSize,
      sortOrder,
      isActive,
    } = body;

    if (!regionId || !name || !questType) {
      return NextResponse.json(
        { error: 'Region ID, name, and quest type are required' },
        { status: 400 }
      );
    }

    await requireOrganiserDistrictAccess(organiser, regionId);

    const quest = await prisma.quest.create({
      data: {
        regionId,
        name,
        description: description || '',
        questType,
        durationMinutes: durationMinutes ?? 30,
        teamSize: teamSize ?? (questType === 'DECISION_ROOM' ? 3 : 1),
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      },
      include: {
        region: true,
      },
    });

    return NextResponse.json({ quest });
  } catch (error: any) {
    if (error?.status === 404) {
      return NextResponse.json({ error: 'District not found or not accessible' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create quest error:', error);
    return NextResponse.json(
      { error: 'Failed to create quest' },
      { status: 500 }
    );
  }
}
