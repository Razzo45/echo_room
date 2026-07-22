import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { requireOrganiserEventAccess } from '@/lib/event-access';
import { seedPlayspaceFromForumPost } from '@/lib/forum-seed';

/**
 * PATCH /api/organiser/events/[id]/forum/[postId]
 * DELETE — soft-unpublish or hard delete
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();
    const event = await requireOrganiserEventAccess(organiser, params.id);
    const existing = await prisma.eventForumPost.findFirst({
      where: { id: params.postId, eventId: event.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.title === 'string') data.title = body.title.trim().slice(0, 200);
    if (typeof body.body === 'string') data.body = body.body.trim().slice(0, 8000);
    if (typeof body.pinned === 'boolean') data.pinned = body.pinned;
    if (typeof body.published === 'boolean') data.published = body.published;
    if (typeof body.seedPlayspace === 'boolean') data.seedPlayspace = body.seedPlayspace;

    let post = await prisma.eventForumPost.update({
      where: { id: existing.id },
      data,
    });

    let seeded: { questId: string | null; roomId: string | null } | null = null;
    const shouldSeed =
      post.published &&
      (body.seedPlayspace === true || post.seedPlayspace) &&
      !post.seededQuestId;
    if (shouldSeed) {
      seeded = await seedPlayspaceFromForumPost(post);
      post = (await prisma.eventForumPost.findUnique({ where: { id: post.id } }))!;
    }

    return NextResponse.json({ post, seeded });
  } catch (error) {
    console.error('Forum PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();
    const event = await requireOrganiserEventAccess(organiser, params.id);
    const existing = await prisma.eventForumPost.findFirst({
      where: { id: params.postId, eventId: event.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    // Unpublish rather than delete so seeded room snapshots stay referential
    const post = await prisma.eventForumPost.update({
      where: { id: existing.id },
      data: { published: false },
    });
    return NextResponse.json({ post });
  } catch (error) {
    console.error('Forum DELETE error:', error);
    return NextResponse.json({ error: 'Failed to unpublish' }, { status: 500 });
  }
}
