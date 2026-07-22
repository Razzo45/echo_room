import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/network/requests — incoming + outgoing for current user.
 * POST /api/network/requests — { toUserId, note? } send request.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const [incoming, outgoing] = await Promise.all([
      prisma.networkRequest.findMany({
        where: { eventId: user.eventId, toUserId: user.id },
        include: {
          fromUser: {
            select: { id: true, name: true, organisation: true, role: true, headline: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.networkRequest.findMany({
        where: { eventId: user.eventId, fromUserId: user.id },
        include: {
          toUser: {
            select: { id: true, name: true, organisation: true, role: true, headline: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      incoming: incoming.map((r) => ({
        id: r.id,
        status: r.status,
        note: r.note,
        createdAt: r.createdAt,
        user: r.fromUser,
      })),
      outgoing: outgoing.map((r) => ({
        id: r.id,
        status: r.status,
        note: r.note,
        createdAt: r.createdAt,
        user: r.toUser,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Network requests GET error:', error);
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const toUserId = typeof body.toUserId === 'string' ? body.toUserId.trim() : '';
    const note =
      typeof body.note === 'string' ? body.note.trim().slice(0, 280) || null : null;

    if (!toUserId || toUserId === user.id) {
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: toUserId, eventId: user.eventId },
    });
    if (!target) {
      return NextResponse.json({ error: 'User not found in this event' }, { status: 404 });
    }

    // Already connected either direction?
    const existing = await prisma.networkRequest.findFirst({
      where: {
        eventId: user.eventId,
        OR: [
          { fromUserId: user.id, toUserId },
          { fromUserId: toUserId, toUserId: user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return NextResponse.json({ error: 'Already connected', request: existing }, { status: 409 });
      }
      if (existing.status === 'PENDING') {
        return NextResponse.json({ error: 'Request already pending', request: existing }, { status: 409 });
      }
      // Re-open declined: update to pending from current sender
      const updated = await prisma.networkRequest.update({
        where: { id: existing.id },
        data: {
          fromUserId: user.id,
          toUserId,
          status: 'PENDING',
          note,
        },
      });
      return NextResponse.json({ request: updated });
    }

    const created = await prisma.networkRequest.create({
      data: {
        eventId: user.eventId,
        fromUserId: user.id,
        toUserId,
        note,
      },
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Network requests POST error:', error);
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
  }
}
