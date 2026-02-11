import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth-organiser';

const INACTIVE_DAYS = 7;

/**
 * POST /api/admin/rooms/close-inactive
 * Close IN_PROGRESS rooms with no activity for 1 week.
 * Safe to call from a cron job (e.g. daily) or manually from admin.
 */
export async function POST() {
  try {
    await requireAdminAuth();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - INACTIVE_DAYS);

    // Close rooms that are IN_PROGRESS and (lastActivityAt or updatedAt) is before cutoff
    const toClose = await prisma.room.findMany({
      where: {
        status: 'IN_PROGRESS',
        OR: [
          { lastActivityAt: { lt: cutoff } },
          {
            lastActivityAt: null,
            updatedAt: { lt: cutoff },
          },
        ],
      },
      select: { id: true },
    });

    const now = new Date();
    await prisma.room.updateMany({
      where: { id: { in: toClose.map((r) => r.id) } },
      data: { status: 'CLOSED', closedAt: now },
    });

    return NextResponse.json({
      success: true,
      closed: toClose.length,
      message: `Closed ${toClose.length} inactive room(s).`,
    });
  } catch (error) {
    console.error('Close inactive rooms error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
