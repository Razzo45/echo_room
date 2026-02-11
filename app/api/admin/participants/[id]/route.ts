import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth-organiser';

// DELETE /api/admin/participants/[id] – remove a participant (User) and their data
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth();

    const userId = params.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // QuestResponse and AnalyticsEvent have no FK relation to User; delete explicitly
    await prisma.questResponse.deleteMany({ where: { userId } });
    await prisma.analyticsEvent.deleteMany({ where: { userId } });
    // Then delete User (cascades to Session, RoomMember, Vote, UserBadge)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: `Participant "${user.name}" has been removed.`,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === 'Admin authentication required' ||
        error.message === 'Admin access required')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin delete participant error:', error);
    return NextResponse.json(
      { error: 'Failed to remove participant' },
      { status: 500 }
    );
  }
}
