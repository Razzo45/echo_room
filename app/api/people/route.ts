import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/people?q=...
 * Participant directory: list other participants in the same event who have
 * opted in (isDiscoverable=true). Search by name, organisation, or role.
 * Only available to the logged-in participant; organisers/admins use their own views.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const eventId = user.eventId;
    const search = request.nextUrl.searchParams.get('q')?.trim() ?? '';

    const where: {
      eventId: string;
      isDiscoverable: true;
      id?: { not: string };
      OR?: Array<
        | { name: { contains: string; mode: 'insensitive' } }
        | { organisation: { contains: string; mode: 'insensitive' } }
        | { role: { contains: string; mode: 'insensitive' } }
        | { headline: { contains: string; mode: 'insensitive' } }
      >;
    } = {
      eventId,
      isDiscoverable: true,
      id: { not: user.id }, // Exclude self
    };

    if (search.length > 0) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { organisation: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } },
        { headline: { contains: search, mode: 'insensitive' } },
      ];
    }

    const people = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        organisation: true,
        role: true,
        headline: true,
        linkedinUrl: true,
      },
      orderBy: [{ name: 'asc' }],
      take: 100,
    });

    return NextResponse.json({
      people: people.map((p) => ({
        id: p.id,
        name: p.name,
        organisation: p.organisation,
        role: p.role,
        headline: p.headline ?? null,
        linkedinUrl: p.linkedinUrl ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('People list error:', error);
    return NextResponse.json(
      { error: 'Failed to load people' },
      { status: 500 }
    );
  }
}
