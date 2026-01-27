import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

// GET /api/organiser\events - List all events for current organiser
export async function GET(request: Request) {
  try {
    const organiser = await requireOrganiserAuth();

    const events = await prisma.event.findMany({
      where: organiser.role === 'SUPER_ADMIN'
        ? {}
        : { organiserId: organiser.id },
      include: {
        eventCodes: {
          where: { active: true },
        },
        _count: {
          select: {
            users: true,
            rooms: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/organiser/events - Create new event
export async function POST(request: Request) {
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

    if (!name) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        name,
        organiserId: organiser.id,
        description: description || null,
        aiBrief: aiBrief || null,
        startDate: startDate ? new Date(startDate) : null,
        timezone: timezone || 'UTC',
        brandColor: brandColor || '#0ea5e9',
        logoUrl: logoUrl || null,
        sponsorLogos: sponsorLogos ? JSON.stringify(sponsorLogos) : null,
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Create event error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
