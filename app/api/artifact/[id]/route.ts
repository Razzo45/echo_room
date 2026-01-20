import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const artifactId = params.id;

    const artifact = await prisma.artifact.findUnique({
      where: { id: artifactId },
      include: {
        room: {
          include: {
            members: true,
            quest: true,
          },
        },
      },
    });

    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    // Verify user is a member of the room
    const isMember = artifact.room.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: 'Not authorized to view this artifact' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      artifact: {
        id: artifact.id,
        htmlContent: artifact.htmlContent,
        pdfPath: artifact.pdfPath,
        questName: artifact.room.quest.name,
        createdAt: artifact.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get artifact error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
