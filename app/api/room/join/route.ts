import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { joinRoomSchema } from '@/lib/validation';
import crypto from 'crypto';

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

    // Find open room for this quest
    const openRoom = await prisma.room.findFirst({
      where: {
        questId,
        status: 'OPEN',
        eventId: user.eventId,
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

    let room;

    if (openRoom && openRoom._count.members < 3) {
      // Join existing room
      room = openRoom;
      
      await prisma.roomMember.create({
        data: {
          roomId: room.id,
          userId: user.id,
        },
      });

      // Update room status if now full
      const memberCount = openRoom._count.members + 1;
      if (memberCount === 3) {
        await prisma.room.update({
          where: { id: room.id },
          data: { status: 'FULL' },
        });
      }
    } else {
      // Create new room
      const roomCode = `ROOM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      
      room = await prisma.room.create({
        data: {
          eventId: user.eventId,
          questId,
          roomCode,
          status: 'OPEN',
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
