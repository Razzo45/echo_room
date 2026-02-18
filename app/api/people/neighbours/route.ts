import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/people/neighbours
 * Returns "Decision Neighbours": other participants in the same event, with agreement %
 * (how often they chose the same option as the current user across shared completed rooms).
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const userId = user.id;
    const eventId = user.eventId;

    const myCompletedRooms = await prisma.roomMember.findMany({
      where: {
        userId,
        room: { status: 'COMPLETED' },
      },
      select: { roomId: true },
    });
    const roomIds = myCompletedRooms.map((r) => r.roomId);
    if (roomIds.length === 0) {
      return NextResponse.json({ neighbours: [], stats: null });
    }

    const [votesInRooms, roomMembers, userList] = await Promise.all([
      prisma.vote.findMany({
        where: { roomId: { in: roomIds } },
        select: { roomId: true, userId: true, decisionNumber: true, optionKey: true },
      }),
      prisma.roomMember.findMany({
        where: { roomId: { in: roomIds } },
        select: { roomId: true, userId: true },
      }),
      prisma.user.findMany({
        where: { eventId, id: { not: userId } },
        select: { id: true, name: true },
      }),
    ]);

    const myVotesByRoom = new Map<string, Map<number, string>>();
    for (const v of votesInRooms) {
      if (v.userId !== userId) continue;
      if (!myVotesByRoom.has(v.roomId)) myVotesByRoom.set(v.roomId, new Map());
      myVotesByRoom.get(v.roomId)!.set(v.decisionNumber, v.optionKey);
    }

    const sharedDecisionsByOther = new Map<string, { same: number; total: number }>();
    for (const v of votesInRooms) {
      if (v.userId === userId) continue;
      const myVotes = myVotesByRoom.get(v.roomId);
      if (!myVotes) continue;
      const myOption = myVotes.get(v.decisionNumber);
      if (myOption === undefined) continue;
      const key = v.userId;
      if (!sharedDecisionsByOther.has(key)) sharedDecisionsByOther.set(key, { same: 0, total: 0 });
      const rec = sharedDecisionsByOther.get(key)!;
      rec.total++;
      if (myOption === v.optionKey) rec.same++;
    }

    const userMap = new Map(userList.map((u) => [u.id, u.name]));
    const neighbours = [...sharedDecisionsByOther.entries()]
      .filter(([, r]) => r.total >= 1)
      .map(([otherId, r]) => ({
        userId: otherId,
        name: userMap.get(otherId) ?? 'Unknown',
        agreementPercent: r.total ? Math.round((100 * r.same) / r.total) : 0,
        sharedDecisions: r.total,
      }))
      .sort((a, b) => b.agreementPercent - a.agreementPercent)
      .slice(0, 10);

    const uniqueTeammates = new Set(
      roomMembers.filter((m) => m.userId !== userId).map((m) => m.userId)
    );
    const teammatesByCountry = await prisma.roomMember.findMany({
      where: { roomId: { in: roomIds }, userId: { not: userId } },
      include: { user: { select: { country: true } } },
    });
    const countries = new Set(teammatesByCountry.map((m) => m.user.country));

    return NextResponse.json({
      neighbours,
      stats: {
        uniqueCollaborators: uniqueTeammates.size,
        countriesCollaborated: countries.size,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Neighbours error:', error);
    return NextResponse.json(
      { error: 'Failed to load neighbours' },
      { status: 500 }
    );
  }
}
