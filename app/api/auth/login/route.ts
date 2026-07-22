import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import {
  hashParticipantPassword,
  normalizeParticipantName,
  verifyParticipantPassword,
} from '@/lib/auth-password';
import { participantLoginSchema } from '@/lib/validation';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { purgeInactiveUsers } from '@/lib/data-retention';

type FoundUser = {
  id: string;
  name: string;
  organisation: string;
  passwordHash: string | null;
};

async function findNamedUserInEvent(
  eventId: string,
  name: string
): Promise<FoundUser | null> {
  const nameKey = normalizeParticipantName(name);
  const candidates = await prisma.user.findMany({
    where: {
      eventId,
      name: { equals: name.trim(), mode: 'insensitive' },
      NOT: { name: 'Unnamed' },
    },
    select: {
      id: true,
      name: true,
      organisation: true,
      passwordHash: true,
    },
  });

  return (
    candidates.find((u) => normalizeParticipantName(u.name) === nameKey) ??
    candidates[0] ??
    null
  );
}

function profileIncomplete(user: FoundUser): boolean {
  return (
    user.name === 'Unnamed' ||
    !user.passwordHash ||
    user.organisation === 'Not set'
  );
}

export async function POST(request: NextRequest) {
  try {
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

    const eventCode = await prisma.eventCode.findUnique({
      where: { code },
    });

    if (!eventCode || !eventCode.active) {
      return NextResponse.json(
        { error: 'Invalid or inactive event code' },
        { status: 401 }
      );
    }

    const user = await findNamedUserInEvent(eventCode.eventId, name);

    if (!user) {
      return NextResponse.json(
        {
          error:
            'No account with that name for this event. Use Join event if you are new, or check the name spelling.',
        },
        { status: 404 }
      );
    }

    let passwordCreated = false;

    if (user.passwordHash) {
      const valid = await verifyParticipantPassword(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: 'Name or password is incorrect' },
          { status: 401 }
        );
      }
    } else {
      // Existing account from before passwords: set password on first login
      const passwordHash = await hashParticipantPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      user.passwordHash = passwordHash;
      passwordCreated = true;
    }

    await createSession(user.id, eventCode.id, rememberMe || false);

    return NextResponse.json({
      success: true,
      userId: user.id,
      needsProfile: profileIncomplete(user),
      passwordCreated,
    });
  } catch (error) {
    console.error('Auth login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
