import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

// GET /api/organiser/events/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganiserAuth();

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        eventCodes: true,
        regions: {
          include: {
            quests: {
              include: {
                decisions: {
                  include: {
                    options: true,
                  },
                },
              },
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
    await requireOrganiserAuth();

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

    const event = await prisma.event.update({
      where: { id: params.id },
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

    return NextResponse.json({ event });
  } catch (error) {
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
    await requireOrganiserAuth();

    await prisma.event.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
