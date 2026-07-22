import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/feed — published forum posts for the participant's event.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const posts = await prisma.eventForumPost.findMany({
      where: { eventId: user.eventId, published: true },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        pinned: true,
        publishedAt: true,
        seededQuestId: true,
        organiser: { select: { name: true } },
      },
    });

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        body: p.body,
        pinned: p.pinned,
        publishedAt: p.publishedAt,
        seededQuestId: p.seededQuestId,
        authorName: p.organiser.name,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Feed GET error:', error);
    return NextResponse.json({ error: 'Failed to load feed' }, { status: 500 });
  }
}
