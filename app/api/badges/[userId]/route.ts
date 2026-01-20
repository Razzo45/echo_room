import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getUserBadges } from '@/lib/badges';

/**
 * GET /api/badges/[userId] - Get badges for a specific user (public profile)
 */
export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Optional: require auth to view other users' badges
    // For now, allow public viewing
    const userId = params.userId;

    const badges = await getUserBadges(userId);

    return NextResponse.json({
      badges: badges.map((ub) => ({
        badgeType: ub.badge.badgeType,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        rarity: ub.badge.rarity,
        earnedAt: ub.earnedAt,
      })),
    });
  } catch (error) {
    console.error('Get user badges error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
