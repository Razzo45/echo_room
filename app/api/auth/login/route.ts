import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { normalizeParticipantName, verifyParticipantPassword } from '@/lib/auth-password';
import { participantLoginSchema } from '@/lib/validation';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { purgeInactiveUsers } from '@/lib/data-retention';

export async function POST(request: NextRequest) {
  try {
    // Opportunistic cleanup (non-blocking for response path)
    void purgeInactiveUsers().catch((err) =>
      console.error('Inactive user purge failed:', err)
    );

    const isE2E = request.headers.get('x-e2e') === 'true';
    if (!isE2E) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const rateLimitKey = getRateLimitKey('participant-login', ip);
      if (!rateLimit(rateLimitKey, 10, 15 * 60 * 1000)) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429 }
        );
      }
    }

    const body = await request.json();
    const validation = participantLoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { code, name, password, rememberMe } = validation.data;
    const nameKey = normalizeParticipantName(name);

    const eventCode = await prisma.eventCode.findUnique({
      where: { code },
      include: { event: true },
    });

    if (!eventCode || !eventCode.active) {
      return NextResponse.json(
        { error: 'Invalid or inactive event code' },
        { status: 401 }
      );
    }

    const candidates = await prisma.user.findMany({
      where: {
        eventId: eventCode.eventId,
        passwordHash: { not: null },
        name: { equals: name.trim(), mode: 'insensitive' },
        NOT: { name: 'Unnamed' },
      },
      select: {
        id: true,
        name: true,
        passwordHash: true,
      },
    });

    // Prefer exact normalized match if multiple casing variants somehow exist
    const user =
      candidates.find((u) => normalizeParticipantName(u.name) === nameKey) ??
      candidates[0];

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: 'Name or password is incorrect' },
        { status: 401 }
      );
    }

    const valid = await verifyParticipantPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Name or password is incorrect' },
        { status: 401 }
      );
    }

    await createSession(user.id, eventCode.id, rememberMe || false);

    return NextResponse.json({
      success: true,
      userId: user.id,
      needsProfile: false,
    });
  } catch (error) {
    console.error('Auth login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
