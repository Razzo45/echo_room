import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth-organiser';
import { logAdminAction } from '@/lib/admin-audit';

// PATCH /api/admin/events/[id]/retention – set "keep longer" override (audit trail)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireAdminAuth();
    const eventId = params.id;
    const body = await request.json();
    const { retentionOverride } = body as { retentionOverride?: boolean };

    if (typeof retentionOverride !== 'boolean') {
      return NextResponse.json(
        { error: 'retentionOverride (boolean) is required' },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        retentionOverride,
        retentionOverrideAt: retentionOverride ? new Date() : null,
        retentionOverrideBy: retentionOverride ? organiser.id : null,
      },
    });

    await logAdminAction({
      organiserId: organiser.id,
      action: 'retention.override',
      resourceType: 'event',
      resourceId: eventId,
      details: { eventName: event.name, retentionOverride },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Admin authentication required' || error.message === 'Admin access required')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('PATCH retention error:', error);
    return NextResponse.json(
      { error: 'Failed to update retention' },
      { status: 500 }
    );
  }
}
