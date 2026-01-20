import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateArtifact } from '@/lib/artifact';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const roomId = body.roomId;

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Verify room and membership
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

    const isMember = room.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: 'Not a member of this room' },
        { status: 403 }
      );
    }

    if (room.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Room is not completed yet' },
        { status: 400 }
      );
    }

    // If artifact already exists, return it
    if (room.artifact) {
      return NextResponse.json({
        artifactId: room.artifact.id,
        message: 'Artifact already generated',
      });
    }

    // Generate artifact
    const artifact = await generateArtifact(roomId);

    return NextResponse.json({
      artifactId: artifact.id,
      message: 'Artifact generated successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Generate artifact error:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating artifact' },
      { status: 500 }
    );
  }
}
