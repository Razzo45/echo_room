import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { joinRoomSchema } from '@/lib/validation';
import crypto from 'crypto';
import { sendRoomReadyPush } from '@/lib/push';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const validation = joinRoomSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { questId } = validation.data;

    // First get quest to know team size and min to start
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      select: { teamSize: true, minTeamSize: true },
    });

    if (!quest) {
      return NextResponse.json(
        { error: 'Quest not found' },
        { status: 404 }
      );
    }

    // Check if user already in a room for this quest
    const existingMembership = await prisma.roomMember.findFirst({
      where: {
        userId: user.id,
        room: {
          questId,
          status: { in: ['OPEN', 'FULL', 'IN_PROGRESS'] },
        },
      },
      include: {
        room: true,
      },
    });

    if (existingMembership) {
      return NextResponse.json({
        roomId: existingMembership.room.id,
        roomCode: existingMembership.room.roomCode,
        joined: false,
        message: 'Already in a room for this quest',
      });
    }

    // Find an available room for this quest.
    // We allow joining rooms that have already auto-started (IN_PROGRESS)
    // as long as they are not full yet, so late joiners land in the same room.
    const openRoom = await prisma.room.findFirst({
      where: {
        questId,
        eventId: user.eventId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const minTeamSize = quest.minTeamSize ?? 2;
    let room;

    if (openRoom && openRoom._count.members < quest.teamSize) {
      // Join existing room (OPEN or IN_PROGRESS but not yet full)
      const memberCount = openRoom._count.members + 1;
      console.log(`Joining existing room ${openRoom.id} with ${memberCount} members (max: ${quest.teamSize}, minToStart: ${minTeamSize})`);
      room = openRoom;

      await prisma.roomMember.create({
        data: {
          roomId: room.id,
          userId: user.id,
        },
      });

      const now = new Date();
      // Auto-start when we reach min players (lock room; no more joins)
      const shouldAutoStart = memberCount >= minTeamSize;
      await prisma.room.update({
        where: { id: room.id },
        data: {
          status: shouldAutoStart ? 'IN_PROGRESS' : memberCount >= quest.teamSize ? 'FULL' : 'OPEN',
          ...(shouldAutoStart && { startedAt: now }),
          lastActivityAt: now,
        },
      });
      if (shouldAutoStart) {
        // Fire-and-forget push notification when room becomes ready
        sendRoomReadyPush(room.id).catch((err) => {
          console.error('Failed to send room ready push notification', err);
        });
      }
    } else {
      // Create new room
      console.log(`Creating new room for quest ${questId} (no open rooms with space)`);
      const roomCode = `ROOM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      
      const now = new Date();
      room = await prisma.room.create({
        data: {
          eventId: user.eventId,
          questId,
          roomCode,
          status: 'OPEN',
          lastActivityAt: now,
          members: {
            create: {
              userId: user.id,
            },
          },
        },
      });
    }

    return NextResponse.json({
      roomId: room.id,
      roomCode: room.roomCode,
      joined: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Room join error:', error);
    return NextResponse.json(
      { error: 'An error occurred while joining room' },
      { status: 500 }
    );
  }
}
