import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { requireOrganiserEventAccess } from '@/lib/event-access';
import { seedPlayspaceFromForumPost } from '@/lib/forum-seed';
import type { ForumPostType } from '@prisma/client';

const TYPES: ForumPostType[] = ['UPDATE', 'SPEAKER', 'PANEL', 'NEWSLETTER'];

/**
 * GET /api/organiser/events/[id]/forum
 * POST — create post { title, body, type, pinned?, published?, seedPlayspace? }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();
    const event = await requireOrganiserEventAccess(organiser, params.id);
    const posts = await prisma.eventForumPost.findMany({
      where: { eventId: event.id },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
    });
    return NextResponse.json({ posts });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    const message = error instanceof Error ? error.message : 'Failed';
    if (message.includes('authentication') || message.includes('Organiser')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: status === 404 ? 404 : 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();
    const event = await requireOrganiserEventAccess(organiser, params.id);
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    const type = TYPES.includes(body.type) ? (body.type as ForumPostType) : 'UPDATE';
    const pinned = !!body.pinned;
    const published = body.published !== false;
    const seedPlayspace = !!body.seedPlayspace;

    if (!title || !text) {
      return NextResponse.json({ error: 'title and body required' }, { status: 400 });
    }

    let post = await prisma.eventForumPost.create({
      data: {
        eventId: event.id,
        organiserId: organiser.id,
        title: title.slice(0, 200),
        body: text.slice(0, 8000),
        type,
        pinned,
        published,
        seedPlayspace,
        publishedAt: new Date(),
      },
    });

    let seeded: { questId: string | null; roomId: string | null } = {
      questId: null,
      roomId: null,
    };
    if (published && seedPlayspace) {
      seeded = await seedPlayspaceFromForumPost(post);
      post = (await prisma.eventForumPost.findUnique({ where: { id: post.id } }))!;
    }

    return NextResponse.json({ post, seeded }, { status: 201 });
  } catch (error) {
    console.error('Forum POST error:', error);
    const status = (error as { status?: number }).status ?? 500;
    const message = error instanceof Error ? error.message : 'Failed';
    if (message.includes('authentication') || message.includes('Organiser')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: status === 404 ? 404 : 500 });
  }
}
