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
          },
        },
      },
    });

    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    // Check if user is a member of the room
    const isMember = artifact.room.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Serve PDF from base64 if available, otherwise try file path
    if (artifact.pdfContent) {
      const pdfBuffer = Buffer.from(artifact.pdfContent, 'base64');
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="decision-map-${artifactId}.pdf"`,
        },
      });
    }

    // Fallback to file path (for local dev)
    if (artifact.pdfPath) {
      return NextResponse.redirect(new URL(artifact.pdfPath, request.url));
    }

    return NextResponse.json(
      { error: 'PDF not available' },
      { status: 404 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get PDF error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
