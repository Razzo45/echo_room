import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { normalizeStoryState, stripInternalStoryState } from '@/lib/story-runtime';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const roomId = params.id;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isMember = room.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
    }

    const playerIds = room.members.map((m) => m.userId);
    const storyState = normalizeStoryState(room.storyState, playerIds);

    return NextResponse.json({
      roomId: room.id,
      status: room.status,
      storyState: stripInternalStoryState(storyState),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Runtime state fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching runtime state' },
      { status: 500 }
    );
  }
}
