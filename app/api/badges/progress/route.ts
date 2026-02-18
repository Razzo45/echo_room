import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getProgressTowardBadges } from '@/lib/badges';

/**
 * GET /api/badges/progress
 * Returns progress hints toward journey badges the user doesn't have yet (for contextual UI).
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const hints = await getProgressTowardBadges(user.id);
    return NextResponse.json({ hints });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Badge progress error:', error);
    return NextResponse.json(
      { error: 'Failed to load progress' },
      { status: 500 }
    );
  }
}
