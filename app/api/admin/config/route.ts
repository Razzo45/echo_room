import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminAuth } from '@/lib/auth-organiser';

// System configuration endpoint
// For now, this is a placeholder - actual config can be stored in database or env vars

export async function GET() {
  try {
    await requireSuperAdminAuth();

    // Return current system configuration
    // This could be extended to read from a database table or env vars
    return NextResponse.json({
      config: {
        systemName: 'Echo Room',
        version: '1.0.0',
        features: {
          aiGeneration: !!process.env.OPENAI_API_KEY,
          badges: true,
          analytics: true,
        },
        limits: {
          maxEventCodes: 100,
          maxRoomsPerEvent: 1000,
          maxParticipantsPerRoom: 10,
        },
      },
    });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (error.message === 'Admin authentication required' || error.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin get config error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireSuperAdminAuth();

    // Placeholder for updating system configuration
    // In a real implementation, this would update a database table or env vars
    
    return NextResponse.json({
      message: 'Configuration update not yet implemented',
    });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (error.message === 'Admin authentication required' || error.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin update config error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
