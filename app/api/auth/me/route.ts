import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const needsProfile = user.name === 'Unnamed';

    let event: { debugMode: boolean } | undefined;
    if (user.eventId) {
      const e = await prisma.event.findUnique({
        where: { id: user.eventId },
        select: { debugMode: true },
      });
      if (e) event = { debugMode: e.debugMode };
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        organisation: user.organisation,
        role: user.role,
        country: user.country,
        skill: user.skill,
        curiosity: user.curiosity,
      },
      needsProfile,
      event,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
