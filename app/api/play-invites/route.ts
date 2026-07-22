import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { createPrivatePlayRoom, pickDefaultQuestId } from '@/lib/play-invite';

/**
 * GET /api/play-invites — incoming + outgoing
 * POST — { toUserId, questId?, note? }
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const [incoming, outgoing] = await Promise.all([
      prisma.playInvite.findMany({
        where: { eventId: user.eventId, toUserId: user.id },
        include: {
          fromUser: { select: { id: true, name: true, organisation: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.playInvite.findMany({
        where: { eventId: user.eventId, fromUserId: user.id },
        include: {
          toUser: { select: { id: true, name: true, organisation: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    return NextResponse.json({
      incoming: incoming.map((r) => ({
        id: r.id,
        status: r.status,
        note: r.note,
        roomId: r.roomId,
        questId: r.questId,
        createdAt: r.createdAt,
        user: r.fromUser,
      })),
      outgoing: outgoing.map((r) => ({
        id: r.id,
        status: r.status,
        note: r.note,
        roomId: r.roomId,
        questId: r.questId,
        createdAt: r.createdAt,
        user: r.toUser,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to load invites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const toUserId = typeof body.toUserId === 'string' ? body.toUserId.trim() : '';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 280) || null : null;
    let questId = typeof body.questId === 'string' ? body.questId.trim() : '';

    if (!toUserId || toUserId === user.id) {
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: toUserId, eventId: user.eventId },
    });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!questId) {
      questId = (await pickDefaultQuestId(user.eventId)) || '';
    }
    if (!questId) {
      return NextResponse.json(
        { error: 'No playable quest yet — organiser needs to publish content first' },
        { status: 400 }
      );
    }

    const pending = await prisma.playInvite.findFirst({
      where: {
        eventId: user.eventId,
        status: 'PENDING',
        OR: [
          { fromUserId: user.id, toUserId },
          { fromUserId: toUserId, toUserId: user.id },
        ],
      },
    });
    if (pending) {
      return NextResponse.json({ error: 'Play invite already pending', invite: pending }, { status: 409 });
    }

    const invite = await prisma.playInvite.create({
      data: {
        eventId: user.eventId,
        fromUserId: user.id,
        toUserId,
        questId,
        note,
      },
    });

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Play invite POST error:', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
