import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getUserBadges, getBadgeStats } from '@/lib/badges';

/**
 * GET /api/badges - Get current user's badges
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const badges = await getUserBadges(user.id);
    const stats = await getBadgeStats(user.id);

    return NextResponse.json({
      badges: badges.map((ub) => ({
        id: ub.id,
        badgeType: ub.badge.badgeType,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        rarity: ub.badge.rarity,
        roomId: ub.roomId,
        metadata: ub.metadata ? JSON.parse(ub.metadata) : null,
        earnedAt: ub.earnedAt,
      })),
      stats,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get badges error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
