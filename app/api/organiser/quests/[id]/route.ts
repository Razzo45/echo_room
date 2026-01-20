import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

// GET /api/organiser/quests/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganiserAuth();

    const quest = await prisma.quest.findUnique({
      where: { id: params.id },
      include: {
        region: true,
        decisions: {
          include: {
            options: true,
          },
          orderBy: { decisionNumber: 'asc' },
        },
        fields: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!quest) {
      return NextResponse.json(
        { error: 'Quest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ quest });
  } catch (error) {
    console.error('Get quest error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quest' },
      { status: 500 }
    );
  }
}

// PUT /api/organiser/quests/[id]
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
      durationMinutes,
      teamSize,
      sortOrder,
      isActive,
    } = body;

    const quest = await prisma.quest.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(durationMinutes && { durationMinutes }),
        ...(teamSize && { teamSize }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ quest });
  } catch (error) {
    console.error('Update quest error:', error);
    return NextResponse.json(
      { error: 'Failed to update quest' },
      { status: 500 }
    );
  }
}

// DELETE /api/organiser/quests/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganiserAuth();

    await prisma.quest.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete quest error:', error);
    return NextResponse.json(
      { error: 'Failed to delete quest' },
      { status: 500 }
    );
  }
}
