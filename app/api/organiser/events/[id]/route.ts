import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

// GET /api/organiser/events/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();

    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
        ...(organiser.role === 'SUPER_ADMIN'
          ? {}
          : { organiserId: organiser.id }),
      },
      include: {
        eventCodes: true,
        regions: {
          include: {
            quests: {
              include: {
                _count: {
                  select: { rooms: true },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
            _count: {
              select: {
                quests: true,
              },
            },
          },
        },
        generations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            users: true,
            rooms: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Get event error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// PUT /api/organiser/events/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();

    const body = await request.json();
    const {
      name,
      description,
      aiBrief,
      startDate,
      timezone,
      brandColor,
      logoUrl,
      sponsorLogos,
    } = body;

    const event = await prisma.event.updateMany({
      where: {
        id: params.id,
        ...(organiser.role === 'SUPER_ADMIN'
          ? {}
          : { organiserId: organiser.id }),
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(aiBrief !== undefined && { aiBrief }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(timezone && { timezone }),
        ...(brandColor && { brandColor }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(sponsorLogos && { sponsorLogos: JSON.stringify(sponsorLogos) }),
      },
    });

    if (event.count === 0) {
      return NextResponse.json(
        { error: 'Event not found or not accessible' },
        { status: 404 }
      );
    }

    const updated = await prisma.event.findUnique({
      where: { id: params.id },
    });

    return NextResponse.json({ event: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Update event error:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE /api/organiser/events/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();

    const deleted = await prisma.event.deleteMany({
      where: {
        id: params.id,
        ...(organiser.role === 'SUPER_ADMIN'
          ? {}
          : { organiserId: organiser.id }),
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Event not found or not accessible' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Delete event error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
