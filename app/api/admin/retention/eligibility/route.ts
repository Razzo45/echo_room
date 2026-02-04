import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-organiser';
import { getEligibleEventIds } from '@/lib/data-retention';

// GET /api/admin/retention/eligibility – list events eligible for cleanup (2 weeks past endDate, no override)
export async function GET() {
  try {
    await requireAdminAuth();
    const events = await getEligibleEventIds();
    return NextResponse.json({ events });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Admin authentication required' || error.message === 'Admin access required')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Retention eligibility error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eligibility' },
      { status: 500 }
    );
  }
}
