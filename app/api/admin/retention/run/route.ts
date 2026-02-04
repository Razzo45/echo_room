import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-organiser';
import { runCleanupForEvent, runCleanupForAllEligible } from '@/lib/data-retention';

// POST /api/admin/retention/run – run cleanup for eligible events (or one by eventId)
export async function POST(request: NextRequest) {
  try {
    const organiser = await requireAdminAuth();
    const body = await request.json().catch(() => ({}));
    const { eventId } = body as { eventId?: string };

    if (eventId) {
      const result = await runCleanupForEvent(eventId, organiser.id);
      if (!result) {
        return NextResponse.json(
          { error: 'Event not found, not eligible, or retention override is set' },
          { status: 400 }
        );
      }
      return NextResponse.json({ results: [result] });
    }

    const results = await runCleanupForAllEligible(organiser.id);
    return NextResponse.json({ results });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Admin authentication required' || error.message === 'Admin access required')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Retention run error:', error);
    return NextResponse.json(
      { error: 'Failed to run retention cleanup' },
      { status: 500 }
    );
  }
}
