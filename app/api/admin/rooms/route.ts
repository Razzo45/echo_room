import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth-organiser';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    const rooms = await prisma.room.findMany({
      where: eventId ? { eventId } : undefined,
      include: {
        quest: true,
        members: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            votes: true,
            commits: true,
          },
        },
        artifact: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      rooms: rooms.map((room) => ({
        id: room.id,
        roomCode: room.roomCode,
        status: room.status,
        currentDecision: room.currentDecision,
        questName: room.quest.name,
        members: room.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          organisation: m.user.organisation,
        })),
        memberCount: room.members.length,
        voteCount: room._count.votes,
        commitCount: room._count.commits,
        hasArtifact: !!room.artifact,
        startedAt: room.startedAt,
        completedAt: room.completedAt,
        createdAt: room.createdAt,
      })),
    });
  } catch (error) {
    console.error('Admin get rooms error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth();

    const body = await request.json();
    const { action, roomId, userId, targetRoomId } = body;

    switch (action) {
      case 'force_start':
        await prisma.room.update({
          where: { id: roomId },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          },
        });
        return NextResponse.json({ success: true, message: 'Room force started' });

      case 'mark_completed':
        await prisma.room.update({
          where: { id: roomId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
        return NextResponse.json({ success: true, message: 'Room marked completed' });

      case 'move_user': {
        // Enforce same-event: user can only be moved between rooms of the same event
        const [sourceRoom, targetRoom] = await Promise.all([
          prisma.room.findUnique({
            where: { id: roomId },
            select: { eventId: true },
          }),
          prisma.room.findUnique({
            where: { id: targetRoomId },
            select: { eventId: true },
          }),
        ]);
        if (!sourceRoom || !targetRoom) {
          return NextResponse.json(
            { error: 'Room or target room not found' },
            { status: 404 }
          );
        }
        if (sourceRoom.eventId !== targetRoom.eventId) {
          return NextResponse.json(
            { error: 'Cannot move user across events. Source and target room must belong to the same event.' },
            { status: 400 }
          );
        }
        await prisma.roomMember.deleteMany({
          where: { userId, roomId },
        });
        await prisma.roomMember.create({
          data: { userId, roomId: targetRoomId },
        });
        return NextResponse.json({ success: true, message: 'User moved' });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin room action error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
