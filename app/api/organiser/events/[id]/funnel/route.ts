import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { requireOrganiserEventAccess } from '@/lib/event-access';

/**
 * GET /api/organiser/events/[id]/funnel
 * Quality-first campaign funnel (not vanity DAU).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();
    const event = await requireOrganiserEventAccess(organiser, params.id);
    const eventId = event.id;

    const [
      joined,
      discoverable,
      acceptedConnections,
      messageSenders,
      playInviteAccepted,
      completedMembers,
      artifacts,
      privateRooms,
      openCompleted,
      forumPosts,
    ] = await Promise.all([
      prisma.user.count({ where: { eventId } }),
      prisma.user.count({ where: { eventId, isDiscoverable: true } }),
      prisma.networkRequest.count({ where: { eventId, status: 'ACCEPTED' } }),
      prisma.directMessage.findMany({
        where: { eventId },
        select: { senderId: true },
        distinct: ['senderId'],
      }),
      prisma.playInvite.count({ where: { eventId, status: 'ACCEPTED' } }),
      prisma.roomMember.findMany({
        where: { room: { eventId, status: 'COMPLETED' } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.artifact.count({ where: { room: { eventId } } }),
      prisma.room.count({ where: { eventId, isPrivate: true } }),
      prisma.room.count({
        where: { eventId, isPrivate: false, status: 'COMPLETED' },
      }),
      prisma.eventForumPost.count({ where: { eventId, published: true } }),
    ]);

    const messaged = messageSenders.length;
    const played = completedMembers.length;

    const rate = (n: number, d: number) =>
      d > 0 ? Math.round((1000 * n) / d) / 10 : 0;

    // Cohort: who played with whom (completed rooms)
    const completedRooms = await prisma.room.findMany({
      where: { eventId, status: 'COMPLETED' },
      select: {
        id: true,
        roomCode: true,
        isPrivate: true,
        quest: { select: { name: true } },
        members: {
          select: {
            user: { select: { id: true, name: true, organisation: true } },
          },
        },
        artifact: { select: { id: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 50,
    });

    const cohorts = completedRooms.map((r) => ({
      roomId: r.id,
      roomCode: r.roomCode,
      isPrivate: r.isPrivate,
      questName: r.quest.name,
      artifactId: r.artifact?.id ?? null,
      members: r.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        organisation: m.user.organisation,
      })),
    }));

    return NextResponse.json({
      event: { id: event.id, name: event.name },
      funnel: {
        joined,
        discoverable,
        connections: acceptedConnections,
        messaged,
        playInvitesAccepted: playInviteAccepted,
        completedPlay: played,
        artifacts,
        forumPosts,
        privateRooms,
        openRoomsCompleted: openCompleted,
      },
      rates: {
        discoverableOfJoined: rate(discoverable, joined),
        messagedOfJoined: rate(messaged, joined),
        playedOfJoined: rate(played, joined),
        artifactOfPlayed: rate(artifacts, Math.max(played, 1)),
      },
      cohorts,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed';
    if (msg.includes('authentication') || msg.includes('Organiser')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const status = (error as { status?: number }).status === 404 ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
