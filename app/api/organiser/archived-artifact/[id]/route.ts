import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

/**
 * GET /api/organiser/archived-artifact/[id]
 * Returns archived artifact HTML for the insights "Past generations" view.
 * Event must belong to the current organiser (or SUPER_ADMIN).
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();
    const archive = await prisma.eventArtifactArchive.findFirst({
      where: { id: params.id },
      include: {
        event: { select: { id: true, organiserId: true } },
      },
    });
    if (!archive) {
      return NextResponse.json({ error: 'Archived artifact not found' }, { status: 404 });
    }
    if (organiser.role !== 'SUPER_ADMIN' && archive.event.organiserId !== organiser.id) {
      return NextResponse.json({ error: 'Not allowed to view this artifact' }, { status: 403 });
    }
    return NextResponse.json({ htmlContent: archive.htmlContent });
  } catch (e) {
    if (e instanceof Error && e.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Archived artifact error:', e);
    return NextResponse.json(
      { error: 'Failed to load archived artifact' },
      { status: 500 }
    );
  }
}
