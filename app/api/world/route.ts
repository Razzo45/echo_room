import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();

    const regions = await prisma.region.findMany({
      where: { eventId: user.eventId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { quests: true },
        },
      },
    });

    return NextResponse.json({
      regions: regions.map((r) => ({
        id: r.id,
        name: r.name,
        displayName: r.displayName,
        description: r.description,
        isActive: r.isActive,
        questCount: r._count.quests,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get regions error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
