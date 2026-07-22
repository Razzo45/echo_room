import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth-organiser';
import type { BeatKey, BeatNumber } from '@/lib/story-runtime';
import { createInitialStoryState, lockRoomForUpdate, normalizeStoryState } from '@/lib/story-runtime';
import { logAdminAction } from '@/lib/admin-audit';

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
        storyState: room.storyState,
        id: room.id,
        roomCode: room.roomCode,
        status: room.status,
        isPrivate: room.isPrivate,
        contentVersionId: room.contentVersionId,
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
        artifactId: room.artifact?.id ?? null,
        startedAt: room.startedAt,
        completedAt: room.completedAt,
        lastActivityAt: room.lastActivityAt,
        closedAt: room.closedAt,
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
    const organiser = await requireAdminAuth();

    const body = await request.json();
    const { action, roomId, userId, targetRoomId } = body;

    switch (action) {
      case 'force_start':
        {
          await prisma.$transaction(async (tx) => {
            await lockRoomForUpdate(tx, roomId);
            const room = await tx.room.findUnique({
              where: { id: roomId },
              include: { members: { select: { userId: true } } },
            });
            if (!room) throw new Error('ROOM_NOT_FOUND');

            const now = new Date();
            const memberIds = room.members.map((m) => m.userId);
            const storyState = room.storyState
              ? normalizeStoryState(room.storyState, memberIds)
              : createInitialStoryState(memberIds);

            if (storyState.phase === 'waiting') {
              storyState.phase = 'ready_check';
              storyState.readyCheck.startedAt = now.toISOString();
              storyState.readyCheck.deadlineAt = new Date(now.getTime() + 60_000).toISOString();
            }

            await tx.room.update({
              where: { id: roomId },
              data: {
                status: 'IN_PROGRESS',
                startedAt: now,
                storyState,
                lastActivityAt: now,
              },
            });
          });
          await logAdminAction({
            organiserId: organiser.id,
            action: 'room.force_start',
            resourceType: 'room',
            resourceId: roomId,
          });
        }
        return NextResponse.json({ success: true, message: 'Room force started' });

      case 'reset_ready_check': {
        await prisma.$transaction(async (tx) => {
          await lockRoomForUpdate(tx, roomId);
          const room = await tx.room.findUnique({
            where: { id: roomId },
            include: { members: { select: { userId: true } } },
          });
          if (!room) throw new Error('ROOM_NOT_FOUND');
          const playerIds = room.members.map((m) => m.userId);
          const readyByPlayerId = Object.fromEntries(playerIds.map((id) => [id, false]));
          const now = new Date();
          const storyState = normalizeStoryState(room.storyState, playerIds);
          storyState.phase = 'ready_check';
          storyState.readyCheck = {
            startedAt: now.toISOString(),
            deadlineAt: new Date(now.getTime() + 60_000).toISOString(),
            readyByPlayerId,
          };
          await tx.room.update({
            where: { id: roomId },
            data: { storyState, lastActivityAt: now },
          });
        });
        await logAdminAction({
          organiserId: organiser.id,
          action: 'room.reset_ready_check',
          resourceType: 'room',
          resourceId: roomId,
        });
        return NextResponse.json({ success: true, message: 'Ready-check reset' });
      }

      case 'reopen_beat': {
        await prisma.$transaction(async (tx) => {
          await lockRoomForUpdate(tx, roomId);
          const room = await tx.room.findUnique({
            where: { id: roomId },
            include: { members: { select: { userId: true } } },
          });
          if (!room) throw new Error('ROOM_NOT_FOUND');
          const playerIds = room.members.map((m) => m.userId);
          const storyState = normalizeStoryState(room.storyState, playerIds);
          const beatKey = String(storyState.currentBeat) as BeatKey;
          storyState.phase = 'beat_input';
          storyState.beats[beatKey].consequence = null;
          storyState.beats[beatKey].resolved = false;
          storyState.beats[beatKey].revealed = false;
          storyState.beats[beatKey].rolls = {};
          await tx.room.update({
            where: { id: roomId },
            data: { storyState, lastActivityAt: new Date() },
          });
        });
        await logAdminAction({
          organiserId: organiser.id,
          action: 'room.reopen_beat',
          resourceType: 'room',
          resourceId: roomId,
        });
        return NextResponse.json({ success: true, message: 'Beat reopened' });
      }

      case 'skip_beat': {
        await prisma.$transaction(async (tx) => {
          await lockRoomForUpdate(tx, roomId);
          const room = await tx.room.findUnique({
            where: { id: roomId },
            include: { members: { select: { userId: true } } },
          });
          if (!room) throw new Error('ROOM_NOT_FOUND');
          const playerIds = room.members.map((m) => m.userId);
          const storyState = normalizeStoryState(room.storyState, playerIds);
          const beat = storyState.currentBeat;
          const totalBeats = storyState.totalBeats ?? 5;
          storyState.phase = beat < totalBeats ? 'beat_input' : 'final_panel';
          storyState.currentBeat = beat < totalBeats ? ((beat + 1) as BeatNumber) : beat;
          await tx.room.update({
            where: { id: roomId },
            data: { storyState, lastActivityAt: new Date() },
          });
        });
        await logAdminAction({
          organiserId: organiser.id,
          action: 'room.skip_beat',
          resourceType: 'room',
          resourceId: roomId,
        });
        return NextResponse.json({ success: true, message: 'Beat skipped' });
      }

      case 'force_consequence_generation': {
        await prisma.$transaction(async (tx) => {
          await lockRoomForUpdate(tx, roomId);
          const room = await tx.room.findUnique({
            where: { id: roomId },
            include: { members: { select: { userId: true } } },
          });
          if (!room) throw new Error('ROOM_NOT_FOUND');
          const playerIds = room.members.map((m) => m.userId);
          const storyState = normalizeStoryState(room.storyState, playerIds);
          storyState.phase = 'beat_consequence';
          await tx.room.update({
            where: { id: roomId },
            data: { storyState, lastActivityAt: new Date() },
          });
        });
        await logAdminAction({
          organiserId: organiser.id,
          action: 'room.force_consequence_generation',
          resourceType: 'room',
          resourceId: roomId,
        });
        return NextResponse.json({ success: true, message: 'Consequence generation forced' });
      }

      case 'regenerate_final_synthesis': {
        await prisma.$transaction(async (tx) => {
          await lockRoomForUpdate(tx, roomId);
          const room = await tx.room.findUnique({
            where: { id: roomId },
            include: { members: { select: { userId: true } } },
          });
          if (!room) throw new Error('ROOM_NOT_FOUND');
          const playerIds = room.members.map((m) => m.userId);
          const storyState = normalizeStoryState(room.storyState, playerIds);
          storyState.phase = 'final_panel';
          storyState.finalSynthesis = { status: 'pending', text: '', mode: 'admin_regen' };
          await tx.room.update({
            where: { id: roomId },
            data: { storyState, lastActivityAt: new Date() },
          });
        });
        await logAdminAction({
          organiserId: organiser.id,
          action: 'room.regenerate_final_synthesis',
          resourceType: 'room',
          resourceId: roomId,
        });
        return NextResponse.json({ success: true, message: 'Final synthesis regeneration requested' });
      }

      case 'mark_completed':
        await prisma.$transaction(async (tx) => {
          await lockRoomForUpdate(tx, roomId);
          const room = await tx.room.findUnique({
            where: { id: roomId },
            include: { members: { select: { userId: true } } },
          });
          if (!room) throw new Error('ROOM_NOT_FOUND');
          const playerIds = room.members.map((m) => m.userId);
          const storyState = normalizeStoryState(room.storyState, playerIds);
          storyState.phase = 'completed';
          await tx.room.update({
            where: { id: roomId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              storyState,
            },
          });
        });
        await logAdminAction({
          organiserId: organiser.id,
          action: 'room.mark_completed',
          resourceType: 'room',
          resourceId: roomId,
        });
        return NextResponse.json({ success: true, message: 'Room marked completed' });

      case 'close_room': {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          select: { status: true },
        });
        if (!room) {
          return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }
        if (room.status === 'CLOSED') {
          return NextResponse.json({ error: 'Room is already closed' }, { status: 400 });
        }
        const now = new Date();
        await prisma.room.update({
          where: { id: roomId },
          data: { status: 'CLOSED', closedAt: now },
        });
        await logAdminAction({
          organiserId: organiser.id,
          action: 'room.close',
          resourceType: 'room',
          resourceId: roomId,
        });
        return NextResponse.json({ success: true, message: 'Room closed' });
      }

      case 'delete_room': {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          select: { id: true, roomCode: true },
        });
        if (!room) {
          return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }
        await prisma.room.delete({ where: { id: roomId } });
        await logAdminAction({
          organiserId: organiser.id,
          action: 'room.delete',
          resourceType: 'room',
          resourceId: roomId,
          details: { roomCode: room.roomCode },
        });
        return NextResponse.json({ success: true, message: 'Room deleted' });
      }

      case 'bulk_close': {
        const roomIds: string[] = Array.isArray(body.roomIds) ? body.roomIds : [];
        if (roomIds.length === 0) {
          return NextResponse.json({ error: 'No rooms selected' }, { status: 400 });
        }
        const now = new Date();
        const result = await prisma.room.updateMany({
          where: {
            id: { in: roomIds },
            status: { not: 'CLOSED' },
          },
          data: { status: 'CLOSED', closedAt: now },
        });
        await logAdminAction({
          organiserId: organiser.id,
          action: 'room.bulk_close',
          resourceType: 'room',
          details: { requested: roomIds.length, closed: result.count },
        });
        return NextResponse.json({
          success: true,
          closed: result.count,
          message: `Closed ${result.count} room(s)`,
        });
      }

      case 'bulk_delete': {
        const roomIds: string[] = Array.isArray(body.roomIds) ? body.roomIds : [];
        if (roomIds.length === 0) {
          return NextResponse.json({ error: 'No rooms selected' }, { status: 400 });
        }
        const result = await prisma.room.deleteMany({
          where: { id: { in: roomIds } },
        });
        await logAdminAction({
          organiserId: organiser.id,
          action: 'room.bulk_delete',
          resourceType: 'room',
          details: { requested: roomIds.length, deleted: result.count },
        });
        return NextResponse.json({
          success: true,
          deleted: result.count,
          message: `Deleted ${result.count} room(s)`,
        });
      }

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
        const sourceRuntimeActive = await prisma.room.findUnique({
          where: { id: roomId },
          select: { status: true },
        });
        const targetRuntimeActive = await prisma.room.findUnique({
          where: { id: targetRoomId },
          select: { status: true },
        });
        if (sourceRuntimeActive?.status === 'IN_PROGRESS' || targetRuntimeActive?.status === 'IN_PROGRESS') {
          return NextResponse.json(
            { error: 'Cannot move users into or out of rooms that are in progress.' },
            { status: 409 }
          );
        }
        await prisma.roomMember.deleteMany({
          where: { userId, roomId },
        });
        await prisma.roomMember.create({
          data: { userId, roomId: targetRoomId },
        });
        await logAdminAction({
          organiserId: organiser.id,
          action: 'room.move_user',
          resourceType: 'room',
          resourceId: roomId,
          details: { userId, targetRoomId },
        });
        return NextResponse.json({ success: true, message: 'User moved' });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'ROOM_NOT_FOUND') {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    console.error('Admin room action error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
