import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLevelForUser } from '@/lib/xp';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const needsProfile = user.name === 'Unnamed';

    const [event, levelInfo, badgeCount] = await Promise.all([
      user.eventId
        ? prisma.event.findUnique({
            where: { id: user.eventId },
            select: { debugMode: true },
          }).then((e) => (e ? { debugMode: e.debugMode } : undefined))
        : Promise.resolve(undefined),
      getLevelForUser(user.id),
      prisma.userBadge.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        organisation: user.organisation,
        role: user.role,
        country: user.country,
        skill: user.skill,
        curiosity: user.curiosity,
        headline: user.headline ?? null,
        linkedinUrl: user.linkedinUrl ?? null,
        isDiscoverable: user.isDiscoverable ?? false,
        profileUpdatedAt: user.updatedAt,
        level: levelInfo.level,
        levelLabel: levelInfo.label,
        badgeCount,
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
