import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

// DELETE /api/organiser/districts/[id]
// Remove a district (region) only when it has no quests. Protects against accidental loss of content.
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();

    const regionId = params.id;

    const region = await prisma.region.findUnique({
      where: { id: regionId },
      include: {
        event: true,
        _count: { select: { quests: true } },
      },
    });

    if (!region) {
      return NextResponse.json(
        { error: 'District not found' },
        { status: 404 }
      );
    }

    // Ensure organiser owns the event (or is super admin)
    if (organiser.role !== 'SUPER_ADMIN' && region.event.organiserId !== organiser.id) {
      return NextResponse.json(
        { error: 'Not allowed to delete this district' },
        { status: 403 }
      );
    }

    if (region._count.quests > 0) {
      return NextResponse.json(
        { error: 'Remove or delete all quests in this district first.' },
        { status: 400 }
      );
    }

    await prisma.region.delete({
      where: { id: regionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Delete district error:', error);
    return NextResponse.json(
      { error: 'Failed to delete district' },
      { status: 500 }
    );
  }
}
