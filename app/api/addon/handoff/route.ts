import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

const SESSION_COOKIE_NAME = 'mmo_session';

/**
 * GET /api/addon/handoff?token=…&next=/world?embed=1&returnUrl=…
 * Browser lands here after partner redirects; sets cookie then enters playspace.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim();
    const nextRaw = request.nextUrl.searchParams.get('next') || '/world?embed=1';
    const returnUrl = request.nextUrl.searchParams.get('returnUrl');

    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.redirect(new URL('/?error=addon_session_expired', request.url));
    }

    cookies().set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: session.expiresAt,
      path: '/',
    });

    // Only allow relative next paths (open-redirect guard)
    const nextPath =
      nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/world?embed=1';

    const dest = new URL(nextPath, request.url);
    if (returnUrl && returnUrl.startsWith('http')) {
      dest.searchParams.set('returnUrl', returnUrl);
    }

    return NextResponse.redirect(dest);
  } catch (error) {
    console.error('Addon handoff error:', error);
    return NextResponse.redirect(new URL('/?error=addon_handoff', request.url));
  }
}
