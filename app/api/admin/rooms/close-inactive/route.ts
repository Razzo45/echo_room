import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth-organiser';
import { logAdminAction } from '@/lib/admin-audit';

const INACTIVE_DAYS = 7;

/** Prefer real play timestamps over updatedAt (which bumps on any write). */
function activityAt(room: {
  lastActivityAt: Date | null;
  completedAt: Date | null;
  startedAt: Date | null;
  createdAt: Date;
}): Date {
  return (
    room.lastActivityAt ??
    room.completedAt ??
    room.startedAt ??
    room.createdAt
  );
}

/**
 * POST /api/admin/rooms/close-inactive
 * Close stale rooms (private + open playspace):
 * - OPEN / FULL / IN_PROGRESS with no real activity for 1 week
 * - COMPLETED left hanging for 1 week (archive them)
 */
export async function POST() {
  try {
    const organiser = await requireAdminAuth();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - INACTIVE_DAYS);

    const candidates = await prisma.room.findMany({
      where: {
        status: { in: ['OPEN', 'FULL', 'IN_PROGRESS', 'COMPLETED'] },
      },
      select: {
        id: true,
        isPrivate: true,
        status: true,
        lastActivityAt: true,
        completedAt: true,
        startedAt: true,
        createdAt: true,
      },
    });

    const stale = candidates.filter((r) => activityAt(r) < cutoff);
    const ids = stale.map((r) => r.id);

    const now = new Date();
    if (ids.length > 0) {
      await prisma.room.updateMany({
        where: { id: { in: ids } },
        data: { status: 'CLOSED', closedAt: now },
      });
      await logAdminAction({
        organiserId: organiser.id,
        action: 'room.close_inactive',
        resourceType: 'room',
        details: {
          closed: ids.length,
          cutoff: cutoff.toISOString(),
          inactiveDays: INACTIVE_DAYS,
        },
      });
    }

    const privateClosed = stale.filter((r) => r.isPrivate).length;
    const openClosed = stale.filter((r) => !r.isPrivate).length;

    return NextResponse.json({
      success: true,
      closed: ids.length,
      privateClosed,
      openClosed,
      byStatus: {
        OPEN: stale.filter((r) => r.status === 'OPEN').length,
        FULL: stale.filter((r) => r.status === 'FULL').length,
        IN_PROGRESS: stale.filter((r) => r.status === 'IN_PROGRESS').length,
        COMPLETED: stale.filter((r) => r.status === 'COMPLETED').length,
      },
      cutoff: cutoff.toISOString(),
      message:
        ids.length === 0
          ? `No rooms inactive since ${cutoff.toLocaleDateString()} (checked lastActivityAt → completedAt → startedAt → createdAt).`
          : `Closed ${ids.length} inactive room(s) (${privateClosed} private, ${openClosed} open).`,
    });
  } catch (error) {
    console.error('Close inactive rooms error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
