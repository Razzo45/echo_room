import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { getCurrentOrganiser } from '@/lib/auth-organiser';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const artifactId = params.id;

    const artifact = await prisma.artifact.findUnique({
      where: { id: artifactId },
      include: {
        room: {
          include: {
            event: { select: { organiserId: true } },
            members: true,
            quest: true,
          },
        },
      },
    });

    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    const user = await getCurrentUser();
    const organiser = await getCurrentOrganiser();

    const isRoomMember = user && artifact.room.members.some((m) => m.userId === user.id);
    const isEventOrganiser =
      organiser &&
      (organiser.role === 'SUPER_ADMIN' || artifact.room.event.organiserId === organiser.id);

    if (!isRoomMember && !isEventOrganiser) {
      if (!user && !organiser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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
