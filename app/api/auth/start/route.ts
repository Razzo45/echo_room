import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { eventCodeSchema } from '@/lib/validation';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = getRateLimitKey('event-code', ip);
    
    if (!rateLimit(rateLimitKey, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = eventCodeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { code } = validation.data;

    // Find active event code
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

    // Check max uses if set
    if (eventCode.maxUses && eventCode.usedCount >= eventCode.maxUses) {
      return NextResponse.json(
        { error: 'Event code has reached maximum uses' },
        { status: 401 }
      );
    }

    // Create temporary user (will be updated with profile later)
    const tempUser = await prisma.user.create({
      data: {
        eventId: eventCode.eventId,
        name: 'Unnamed',
        organisation: 'Not set',
        role: 'Not set',
        country: 'Not set',
        skill: 'Not set',
        curiosity: 'Not set',
      },
    });

    // Increment used count
    await prisma.eventCode.update({
      where: { id: eventCode.id },
      data: { usedCount: { increment: 1 } },
    });

    // Create session
    await createSession(tempUser.id, eventCode.id);

    return NextResponse.json({
      success: true,
      userId: tempUser.id,
      needsProfile: true,
    });
  } catch (error) {
    console.error('Auth start error:', error);
    return NextResponse.json(
      { error: 'An error occurred during authentication' },
      { status: 500 }
    );
  }
}
