import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { createPrivatePlayRoom, pickDefaultQuestId } from '@/lib/play-invite';

/**
 * PATCH /api/play-invites/[id] — { action: 'accept' | 'decline' | 'cancel' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const action = body.action;
    if (!['accept', 'decline', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const invite = await prisma.playInvite.findFirst({
      where: { id: params.id, eventId: user.eventId },
    });
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    if (invite.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invite is no longer pending' }, { status: 409 });
    }

    if (action === 'cancel') {
      if (invite.fromUserId !== user.id) {
        return NextResponse.json({ error: 'Only sender can cancel' }, { status: 403 });
      }
      const updated = await prisma.playInvite.update({
        where: { id: invite.id },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ invite: updated });
    }

    if (invite.toUserId !== user.id) {
      return NextResponse.json({ error: 'Only recipient can respond' }, { status: 403 });
    }

    if (action === 'decline') {
      const updated = await prisma.playInvite.update({
        where: { id: invite.id },
        data: { status: 'DECLINED' },
      });
      return NextResponse.json({ invite: updated });
    }

    // accept → private room
    const questId = invite.questId || (await pickDefaultQuestId(user.eventId));
    if (!questId) {
      return NextResponse.json({ error: 'No quest available for play' }, { status: 400 });
    }

    const room = await createPrivatePlayRoom({
      eventId: user.eventId,
      questId,
      playerIds: [invite.fromUserId, invite.toUserId],
    });

    const updated = await prisma.playInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', roomId: room.id, questId },
    });

    return NextResponse.json({
      invite: updated,
      roomId: room.id,
      roomCode: room.roomCode,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Play invite PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update invite' },
      { status: 500 }
    );
  }
}
