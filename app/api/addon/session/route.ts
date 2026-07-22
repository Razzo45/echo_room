import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

const SESSION_DURATION_DAYS = 7;

function requirePartnerKey(request: NextRequest): boolean {
  const expected = process.env.ADDON_PARTNER_KEY;
  if (!expected) return false;
  const auth = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return Boolean(match && match[1] === expected);
}

/**
 * POST /api/addon/session
 * Partner identity handoff → Echo session + playspace URL.
 * Auth: Authorization: Bearer <ADDON_PARTNER_KEY>
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.ADDON_PARTNER_KEY) {
      return NextResponse.json(
        { error: 'Addon not configured (ADDON_PARTNER_KEY)' },
        { status: 503 }
      );
    }
    if (!requirePartnerKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const externalUserId =
      typeof body.externalUserId === 'string' ? body.externalUserId.trim() : '';
    const displayName =
      typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 80) : '';
    const eventExternalId =
      typeof body.eventExternalId === 'string' ? body.eventExternalId.trim() : '';
    const eventCode =
      typeof body.eventCode === 'string' ? body.eventCode.trim().toUpperCase() : '';
    const returnUrl =
      typeof body.returnUrl === 'string' ? body.returnUrl.trim().slice(0, 500) : null;
    const organisation =
      typeof body.organisation === 'string'
        ? body.organisation.trim().slice(0, 120)
        : 'Partner app';

    if (!externalUserId || !displayName) {
      return NextResponse.json(
        { error: 'externalUserId and displayName are required' },
        { status: 400 }
      );
    }

    let codeRow = eventCode
      ? await prisma.eventCode.findFirst({
          where: { code: eventCode, active: true },
          include: { event: true },
        })
      : null;

    if (!codeRow && eventExternalId) {
      codeRow = await prisma.eventCode.findFirst({
        where: {
          active: true,
          OR: [{ code: eventExternalId.toUpperCase() }, { eventId: eventExternalId }],
        },
        include: { event: true },
      });
    }

    if (!codeRow) {
      return NextResponse.json(
        {
          error:
            'Event not found — pass eventCode (or eventExternalId matching an active code / event id)',
        },
        { status: 404 }
      );
    }

    let user = await prisma.user.findFirst({
      where: { eventId: codeRow.eventId, externalUserId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          eventId: codeRow.eventId,
          externalUserId,
          name: displayName,
          organisation: organisation || 'Partner app',
          role: 'Attendee',
          country: 'Not set',
          skill: 'Not set',
          curiosity: 'Addon handoff',
        },
      });
    } else if (displayName && user.name !== displayName) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: displayName },
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        eventCodeId: codeRow.id,
        expiresAt,
      },
    });

    const origin =
      request.headers.get('x-forwarded-host') && request.headers.get('x-forwarded-proto')
        ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('x-forwarded-host')}`
        : new URL(request.url).origin;

    const nextPath = '/world?embed=1';
    const handoff = new URL('/api/addon/handoff', origin);
    handoff.searchParams.set('token', token);
    handoff.searchParams.set('next', nextPath);
    if (returnUrl) handoff.searchParams.set('returnUrl', returnUrl);

    return NextResponse.json({
      echoSessionToken: token,
      playspaceUrl: handoff.toString(),
      userId: user.id,
      eventId: codeRow.eventId,
      needsProfile: user.curiosity === 'Addon handoff',
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Addon session error:', error);
    return NextResponse.json({ error: 'Failed to create addon session' }, { status: 500 });
  }
}
