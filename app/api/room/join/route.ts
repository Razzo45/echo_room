import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { joinRoomSchema } from '@/lib/validation';
import crypto from 'crypto';
import { sendRoomReadyPush } from '@/lib/push';
import { createInitialStoryState, normalizeStoryState } from '@/lib/story-runtime';

function isStoryStateColumnMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  const msg = (e.message || '').toLowerCase();
  return (
    e.code === 'P2022' ||
    msg.includes('storystate') ||
    msg.includes('column') && msg.includes('does not exist')
  );
}

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
      select: {
        teamSize: true,
        minTeamSize: true,
        _count: {
          select: { decisions: true },
        },
      },
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
    // Do not allow joining IN_PROGRESS rooms: runtime membership must remain stable.
    const openRoom = await prisma.room.findFirst({
      where: {
        questId,
        eventId: user.eventId,
        status: 'OPEN',
      },
      include: {
        members: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const minTeamSize = quest.minTeamSize ?? 2;
    const totalBeats = Math.max(1, Math.min(3, quest._count?.decisions || 3)) as 1 | 2 | 3;
    let room;

    if (openRoom && openRoom._count.members < quest.teamSize) {
      // Join existing open room
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
      const readyDeadline = new Date(now.getTime() + 60_000).toISOString();
      try {
        await prisma.room.update({
          where: { id: room.id },
          data: {
            status: shouldAutoStart ? 'IN_PROGRESS' : memberCount >= quest.teamSize ? 'FULL' : 'OPEN',
            ...(shouldAutoStart && { startedAt: now }),
            storyState: (() => {
              const memberIds = [...new Set([...room.members.map((m) => m.userId), user.id])];
              const state = normalizeStoryState(room.storyState, memberIds);
              state.totalBeats = totalBeats;
              if (shouldAutoStart && (state.phase === 'waiting' || state.phase === 'room_full')) {
                state.phase = 'ready_check';
                state.readyCheck.startedAt = now.toISOString();
                state.readyCheck.deadlineAt = readyDeadline;
              } else if (
                state.phase === 'waiting' &&
                memberCount >= quest.teamSize &&
                quest.teamSize > 0
              ) {
                // Same UX as min-met start: briefing + ready on one screen (avoid a separate “room full” step).
                state.phase = 'ready_check';
                state.readyCheck.startedAt = now.toISOString();
                state.readyCheck.deadlineAt = readyDeadline;
              }
              return state;
            })(),
            lastActivityAt: now,
          },
        });
      } catch (error) {
        if (!isStoryStateColumnMissing(error)) throw error;
        // Hotfix fallback for environments where Room.storyState migration has not deployed yet.
        await prisma.room.update({
          where: { id: room.id },
          data: {
            status: shouldAutoStart ? 'IN_PROGRESS' : memberCount >= quest.teamSize ? 'FULL' : 'OPEN',
            ...(shouldAutoStart && { startedAt: now }),
            lastActivityAt: now,
          },
        });
      }
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
      try {
        room = await prisma.room.create({
          data: {
            eventId: user.eventId,
            questId,
            roomCode,
            status: 'OPEN',
            storyState: createInitialStoryState([user.id], totalBeats),
            lastActivityAt: now,
            members: {
              create: {
                userId: user.id,
              },
            },
          },
        });
      } catch (error) {
        if (!isStoryStateColumnMissing(error)) throw error;
        // Hotfix fallback for environments where Room.storyState migration has not deployed yet.
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
