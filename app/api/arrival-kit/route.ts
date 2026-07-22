import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/arrival-kit — finite pre-event checklist (no grind / no streaks).
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const eventId = user.eventId;

    const [discoverable, connection, completedPlay, artifact] = await Promise.all([
      Promise.resolve(user.isDiscoverable),
      prisma.networkRequest.findFirst({
        where: {
          eventId,
          status: 'ACCEPTED',
          OR: [{ fromUserId: user.id }, { toUserId: user.id }],
        },
        select: { id: true },
      }),
      prisma.roomMember.findFirst({
        where: { userId: user.id, room: { eventId, status: 'COMPLETED' } },
        select: { id: true },
      }),
      prisma.roomMember.findFirst({
        where: {
          userId: user.id,
          room: { eventId, artifact: { isNot: null } },
        },
        select: { id: true },
      }),
    ]);

    const items = [
      {
        id: 'profile',
        label: 'Show up in People (discoverable profile)',
        done: discoverable,
        href: '/profile',
      },
      {
        id: 'connect',
        label: 'Connect with at least one person',
        done: !!connection,
        href: '/people',
      },
      {
        id: 'play',
        label: 'Complete one story room (private or open)',
        done: !!completedPlay,
        href: '/world',
      },
      {
        id: 'artifact',
        label: 'Co-create a shared artifact',
        done: !!artifact,
        href: '/me',
      },
    ];

    const doneCount = items.filter((i) => i.done).length;

    return NextResponse.json({
      items,
      doneCount,
      total: items.length,
      complete: doneCount === items.length,
      message: doneCount === items.length ? 'You’re set for the event.' : null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to load arrival kit' }, { status: 500 });
  }
}
