import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { requireOrganiserDistrictAccess } from '@/lib/event-access';

// GET /api/organiser/districts?eventId=xxx
export async function GET(request: Request) {
  try {
    const organiser = await requireOrganiserAuth();

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const districts = await prisma.region.findMany({
      where: {
        eventId,
        event: organiser.role === 'SUPER_ADMIN'
          ? {}
          : { organiserId: organiser.id },
      },
      include: {
        _count: {
          select: { quests: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ districts });
  } catch (error) {
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Get districts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch districts' },
      { status: 500 }
    );
  }
}

// POST /api/organiser/districts
export async function POST(request: Request) {
  try {
    const organiser = await requireOrganiserAuth();

    const body = await request.json();
    const { eventId, name, displayName, description, isActive, sortOrder } = body;

    if (!eventId || !name || !displayName) {
      return NextResponse.json(
        { error: 'Event ID, name, and display name are required' },
        { status: 400 }
      );
    }

    // Ensure organiser owns the event (or is super admin)
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        ...(organiser.role === 'SUPER_ADMIN'
          ? {}
          : { organiserId: organiser.id }),
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or not accessible' },
        { status: 404 }
      );
    }

    const district = await prisma.region.create({
      data: {
        eventId,
        name,
        displayName,
        description: description || '',
        isActive: isActive ?? false,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json({ district });
  } catch (error) {
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Create district error:', error);
    return NextResponse.json(
      { error: 'Failed to create district' },
      { status: 500 }
    );
  }
}

// PUT /api/organiser/districts (body includes id)
export async function PUT(request: Request) {
  try {
    const organiser = await requireOrganiserAuth();

    const body = await request.json();
    const { id, displayName, description, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'District ID is required' },
        { status: 400 }
      );
    }

    await requireOrganiserDistrictAccess(organiser, id);

    const district = await prisma.region.update({
      where: { id },
      data: {
        ...(displayName && { displayName }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json({ district });
  } catch (error: any) {
    if (error?.status === 404) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update district error:', error);
    return NextResponse.json(
      { error: 'Failed to update district' },
      { status: 500 }
    );
  }
}
