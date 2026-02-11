import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateArtifact } from '@/lib/artifact';

/**
 * POST /api/room/[id]/complete
 * Mark the current participant as having finished the quest.
 * When all room members have completed, generate the artifact (once).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const roomId = params.id;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: true,
        artifact: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const membership = room.members.find((m) => m.userId === user.id);
    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this room' },
        { status: 403 }
      );
    }

    if (room.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Room is not yet completed' },
        { status: 400 }
      );
    }

    // Mark this member as completed
    await prisma.roomMember.update({
      where: { id: membership.id },
      data: { completedAt: new Date() },
    });

    // Re-check all members' completion
    const updatedMembers = await prisma.roomMember.findMany({
      where: { roomId },
    });

    const allCompleted = updatedMembers.every((m) => m.completedAt !== null);

    let artifactId: string | null = room.artifact ? room.artifact.id : null;

    // Generate artifact only once all members have completed and no artifact exists
    if (allCompleted && !artifactId) {
      const artifact = await generateArtifact(roomId);
      artifactId = artifact.id;
    }

    return NextResponse.json({
      success: true,
      allCompleted,
      artifactId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Complete room error:', error);
    return NextResponse.json(
      { error: 'An error occurred while marking completion' },
      { status: 500 }
    );
  }
}

