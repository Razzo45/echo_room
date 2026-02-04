import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentOrganiser } from '@/lib/auth-organiser';

/**
 * Inline all <img src="..."> in HTML with base64 data URLs so the document is self-contained.
 * Resolves relative URLs (e.g. /city-district.png) using the request origin.
 */
async function inlineImagesInHtml(html: string, baseUrl: string): Promise<string> {
  const imgRegex = /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi;
  let match: RegExpExecArray | null;
  const replacements: { from: string; to: string }[] = [];

  while ((match = imgRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const before = match[1];
    const src = match[2];
    const after = match[3];

    if (src.startsWith('data:')) continue;

    const absoluteUrl = src.startsWith('http') ? src : `${baseUrl.replace(/\/$/, '')}${src.startsWith('/') ? '' : '/'}${src}`;
    try {
      const res = await fetch(absoluteUrl, { cache: 'force-cache' });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      const contentType = res.headers.get('content-type') || 'image/png';
      const dataUrl = `data:${contentType};base64,${b64}`;
      replacements.push({
        from: fullTag,
        to: `<img${before}src="${dataUrl}"${after}>`,
      });
    } catch {
      // leave original src if fetch fails
    }
  }

  let out = html;
  for (const r of replacements) {
    out = out.replace(r.from, r.to);
  }
  return out;
}

/**
 * GET /api/artifact/[id]/export?format=html
 * Returns artifact HTML with all images inlined as base64 so downloads are self-contained.
 * Same auth as GET /api/artifact/[id].
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const artifactId = params.id;
    const format = request.nextUrl.searchParams.get('format') || 'html';

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

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin);

    const inlinedHtml = await inlineImagesInHtml(artifact.htmlContent, baseUrl);

    if (format === 'html') {
      return new NextResponse(inlinedHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    return NextResponse.json({ htmlContent: inlinedHtml });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Artifact export error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
