import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { voteSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const validation = voteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { roomId, decisionNumber, optionKey, justification } = validation.data;

    // Verify room exists and user is a member
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: true,
        commits: true,
        votes: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isMember = room.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: 'Not a member of this room' },
        { status: 403 }
      );
    }

    if (room.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Room is not in progress' },
        { status: 400 }
      );
    }

    // Async flow: no room-level commit check. Enforce per-user sequence (must vote 1 before 2, 2 before 3).
    const myVotes = room.votes.filter((v) => v.userId === user.id);
    const alreadyVotedThis = myVotes.some((v) => v.decisionNumber === decisionNumber);
    if (alreadyVotedThis) {
      return NextResponse.json(
        { error: 'You have already voted for this decision' },
        { status: 400 }
      );
    }
    if (decisionNumber > 1) {
      const hasPrevious = myVotes.some((v) => v.decisionNumber === decisionNumber - 1);
      if (!hasPrevious) {
        return NextResponse.json(
          { error: `Please vote for decision ${decisionNumber - 1} first` },
          { status: 400 }
        );
      }
    }

    // Create or update vote
    await prisma.vote.upsert({
      where: {
        roomId_userId_decisionNumber: {
          roomId,
          userId: user.id,
          decisionNumber,
        },
      },
      update: {
        optionKey,
        justification,
      },
      create: {
        roomId,
        userId: user.id,
        decisionNumber,
        optionKey,
        justification,
      },
    });

    await prisma.room.update({
      where: { id: roomId },
      data: { lastActivityAt: new Date() },
    });

    // Async flow: when all members have voted for all 3 decisions, create commits (majority) and complete room
    const memberIds = room.members.map((m) => m.userId);
    const votesAfter = await prisma.vote.findMany({
      where: { roomId },
      select: { userId: true, decisionNumber: true, optionKey: true },
    });
    const votesPerUser = memberIds.map((uid) => votesAfter.filter((v) => v.userId === uid).length);
    const allHaveThree = memberIds.length > 0 && votesPerUser.every((c) => c === 3);

    if (allHaveThree) {
      const freshRoom = await prisma.room.findUnique({
        where: { id: roomId },
        include: { commits: true },
      });
      if (freshRoom && freshRoom.commits.length === 0) {
        const now = new Date();
        for (const num of [1, 2, 3]) {
          const votesForNum = votesAfter.filter((v) => v.decisionNumber === num);
          const counts = { A: 0, B: 0, C: 0 };
          votesForNum.forEach((v) => {
            counts[v.optionKey as 'A' | 'B' | 'C']++;
          });
          const majority = (['A', 'B', 'C'] as const).slice().sort((a, b) => counts[b] - counts[a])[0];
          await prisma.decisionCommit.create({
            data: { roomId, decisionNumber: num, committedOption: majority },
          });
        }
        await prisma.room.update({
          where: { id: roomId },
          data: { status: 'COMPLETED', completedAt: now, lastActivityAt: now },
        });
        const { checkRoomCompletionBadges } = await import('@/lib/badges');
        checkRoomCompletionBadges(roomId).catch((err) => console.error('Badges check error:', err));
        const { generateArtifact } = await import('@/lib/artifact');
        try {
          await generateArtifact(roomId);
        } catch (err) {
          console.error('Artifact generation error:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Vote recorded',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'An error occurred while recording vote' },
      { status: 500 }
    );
  }
}
