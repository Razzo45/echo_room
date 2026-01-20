import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

// GET /api/organiser/districts?eventId=xxx
export async function GET(request: Request) {
  try {
    await requireOrganiserAuth();

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const districts = await prisma.region.findMany({
      where: { eventId },
      include: {
        _count: {
          select: { quests: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ districts });
  } catch (error) {
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
    await requireOrganiserAuth();

    const body = await request.json();
    const { eventId, name, displayName, description, isActive, sortOrder } = body;

    if (!eventId || !name || !displayName) {
      return NextResponse.json(
        { error: 'Event ID, name, and display name are required' },
        { status: 400 }
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
    console.error('Create district error:', error);
    return NextResponse.json(
      { error: 'Failed to create district' },
      { status: 500 }
    );
  }
}

// PUT /api/organiser/districts/[id]
export async function PUT(request: Request) {
  try {
    await requireOrganiserAuth();

    const body = await request.json();
    const { id, displayName, description, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'District ID is required' },
        { status: 400 }
      );
    }

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
  } catch (error) {
    console.error('Update district error:', error);
    return NextResponse.json(
      { error: 'Failed to update district' },
      { status: 500 }
    );
  }
}
