import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth-organiser';

// GET /api/admin/retention/log?eventId=xxx – audit trail of cleanup runs
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    const logs = await prisma.retentionCleanupLog.findMany({
      where: eventId ? { eventId } : undefined,
      include: {
        event: { select: { name: true } },
      },
      orderBy: { runAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        eventId: l.eventId,
        eventName: l.event.name,
        runAt: l.runAt,
        triggeredBy: l.triggeredBy,
        deletedSessions: l.deletedSessions,
        deletedVotes: l.deletedVotes,
        deletedDecisionCommits: l.deletedDecisionCommits,
        deletedArtifacts: l.deletedArtifacts,
        deletedUserBadges: l.deletedUserBadges,
        deletedRoomMembers: l.deletedRoomMembers,
        deletedRooms: l.deletedRooms,
        deletedUsers: l.deletedUsers,
        deletedAnalyticsEvents: l.deletedAnalyticsEvents,
      })),
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Admin authentication required' || error.message === 'Admin access required')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Retention log error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retention log' },
      { status: 500 }
    );
  }
}
