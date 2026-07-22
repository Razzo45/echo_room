import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { pickDefaultQuestId } from '@/lib/play-invite';

/**
 * PATCH /api/network/requests/[id] — { action: 'accept' | 'decline' }
 * On accept, if event.offerPrivateRoomOnAccept: soft play invite (no auto room).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const action = body.action === 'accept' || body.action === 'decline' ? body.action : null;
    if (!action) {
      return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 });
    }

    const row = await prisma.networkRequest.findFirst({
      where: { id: params.id, eventId: user.eventId },
    });
    if (!row) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (row.toUserId !== user.id) {
      return NextResponse.json({ error: 'Only the recipient can respond' }, { status: 403 });
    }
    if (row.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request is no longer pending' }, { status: 409 });
    }

    const updated = await prisma.networkRequest.update({
      where: { id: row.id },
      data: { status: action === 'accept' ? 'ACCEPTED' : 'DECLINED' },
    });

    let playInvite: { id: string } | null = null;
    let playOfferSkipped: string | null = null;

    if (action === 'accept') {
      const event = await prisma.event.findUnique({
        where: { id: user.eventId },
        select: { offerPrivateRoomOnAccept: true },
      });

      if (event?.offerPrivateRoomOnAccept) {
        const existing = await prisma.playInvite.findFirst({
          where: {
            eventId: user.eventId,
            status: 'PENDING',
            OR: [
              { fromUserId: row.fromUserId, toUserId: row.toUserId },
              { fromUserId: row.toUserId, toUserId: row.fromUserId },
            ],
          },
        });

        if (existing) {
          playInvite = { id: existing.id };
        } else {
          const questId = await pickDefaultQuestId(user.eventId);
          if (!questId) {
            playOfferSkipped = 'no_quest';
          } else {
            const invite = await prisma.playInvite.create({
              data: {
                eventId: user.eventId,
                fromUserId: row.fromUserId,
                toUserId: row.toUserId,
                questId,
                note: 'Suggested after you connected — optional 15-min story together.',
              },
            });
            playInvite = { id: invite.id };
          }
        }
      }
    }

    return NextResponse.json({
      request: updated,
      playInviteOffered: Boolean(playInvite),
      playInvite,
      playOfferSkipped,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Network request PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
