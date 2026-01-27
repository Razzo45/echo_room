import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

// GET /api/organiser/events - List all events for current organiser
export async function GET(request: Request) {
  try {
    let organiser;
    try {
      organiser = await requireOrganiserAuth();
    } catch (authError) {
      console.error('Auth error in GET /api/organiser/events:', authError);
      if (authError instanceof Error && authError.message === 'Organiser authentication required') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      throw authError;
    }

    const whereClause = organiser.role === 'SUPER_ADMIN'
      ? {}
      : { organiserId: organiser.id };

    let events;
    try {
      events = await prisma.event.findMany({
        where: whereClause,
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
    } catch (dbError) {
      console.error('Database error in GET /api/organiser/events:', dbError);
      throw dbError;
    }

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // In production, include error message in response for debugging
    return NextResponse.json(
      { 
        error: 'Failed to fetch events',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
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
