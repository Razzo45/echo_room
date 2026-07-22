import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function areConnected(eventId: string, a: string, b: string) {
  const row = await prisma.networkRequest.findFirst({
    where: {
      eventId,
      status: 'ACCEPTED',
      OR: [
        { fromUserId: a, toUserId: b },
        { fromUserId: b, toUserId: a },
      ],
    },
  });
  return !!row;
}

/**
 * GET /api/messages?with=userId — thread with peer (requires accepted connection).
 * POST /api/messages — { toUserId, body }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const peerId = request.nextUrl.searchParams.get('with')?.trim() ?? '';
    if (!peerId) {
      // List conversation peers (accepted connections with last message preview)
      const connections = await prisma.networkRequest.findMany({
        where: {
          eventId: user.eventId,
          status: 'ACCEPTED',
          OR: [{ fromUserId: user.id }, { toUserId: user.id }],
        },
        include: {
          fromUser: { select: { id: true, name: true, organisation: true, role: true } },
          toUser: { select: { id: true, name: true, organisation: true, role: true } },
        },
      });

      const peers = connections.map((c) =>
        c.fromUserId === user.id ? c.toUser : c.fromUser
      );

      const threads = await Promise.all(
        peers.map(async (peer) => {
          const last = await prisma.directMessage.findFirst({
            where: {
              eventId: user.eventId,
              OR: [
                { senderId: user.id, recipientId: peer.id },
                { senderId: peer.id, recipientId: user.id },
              ],
            },
            orderBy: { createdAt: 'desc' },
          });
          const unread = await prisma.directMessage.count({
            where: {
              eventId: user.eventId,
              senderId: peer.id,
              recipientId: user.id,
              readAt: null,
            },
          });
          return {
            peer,
            lastMessage: last
              ? { id: last.id, body: last.body, createdAt: last.createdAt, senderId: last.senderId }
              : null,
            unread,
          };
        })
      );

      threads.sort((a, b) => {
        const at = a.lastMessage?.createdAt?.getTime() ?? 0;
        const bt = b.lastMessage?.createdAt?.getTime() ?? 0;
        return bt - at;
      });

      return NextResponse.json({ threads });
    }

    if (!(await areConnected(user.eventId, user.id, peerId))) {
      return NextResponse.json({ error: 'Not connected' }, { status: 403 });
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        eventId: user.eventId,
        OR: [
          { senderId: user.id, recipientId: peerId },
          { senderId: peerId, recipientId: user.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    await prisma.directMessage.updateMany({
      where: {
        eventId: user.eventId,
        senderId: peerId,
        recipientId: user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        senderId: m.senderId,
        recipientId: m.recipientId,
        createdAt: m.createdAt,
        readAt: m.readAt,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const toUserId = typeof body.toUserId === 'string' ? body.toUserId.trim() : '';
    const text = typeof body.body === 'string' ? body.body.trim() : '';

    if (!toUserId || !text) {
      return NextResponse.json({ error: 'toUserId and body required' }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }
    if (!(await areConnected(user.eventId, user.id, toUserId))) {
      return NextResponse.json(
        { error: 'Connect first before messaging' },
        { status: 403 }
      );
    }

    const message = await prisma.directMessage.create({
      data: {
        eventId: user.eventId,
        senderId: user.id,
        recipientId: toUserId,
        body: text,
      },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        body: message.body,
        senderId: message.senderId,
        recipientId: message.recipientId,
        createdAt: message.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
