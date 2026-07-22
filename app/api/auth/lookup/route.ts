import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { normalizeParticipantName } from '@/lib/auth-password';
import { sanitizeText } from '@/lib/sanitize';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit';

const lookupSchema = z.object({
  code: z
    .string()
    .min(1, 'Event code is required')
    .transform((v) => sanitizeText(v).toUpperCase()),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .transform((v) => sanitizeText(v)),
});

/** Check whether a named account exists for an event, and if it still needs a password. */
export async function POST(request: NextRequest) {
  try {
    const isE2E = request.headers.get('x-e2e') === 'true';
    if (!isE2E) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const rateLimitKey = getRateLimitKey('participant-lookup', ip);
      if (!rateLimit(rateLimitKey, 20, 15 * 60 * 1000)) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429 }
        );
      }
    }

    const body = await request.json();
    const validation = lookupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { code, name } = validation.data;
    const nameKey = normalizeParticipantName(name);

    const eventCode = await prisma.eventCode.findUnique({
      where: { code },
      select: { id: true, active: true, eventId: true },
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
        name: { equals: name.trim(), mode: 'insensitive' },
        NOT: { name: 'Unnamed' },
      },
      select: { id: true, name: true, passwordHash: true },
    });

    const user =
      candidates.find((u) => normalizeParticipantName(u.name) === nameKey) ??
      candidates[0];

    if (!user) {
      return NextResponse.json({
        found: false,
        needsPasswordSetup: false,
      });
    }

    return NextResponse.json({
      found: true,
      needsPasswordSetup: !user.passwordHash,
      displayName: user.name,
    });
  } catch (error) {
    console.error('Auth lookup error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
