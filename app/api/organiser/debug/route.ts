import { NextResponse } from 'next/server';
import { getOrganiserFromSession } from '@/lib/auth-organiser';
import { prisma } from '@/lib/db';

// GET /api/organiser/debug - Debug endpoint to check session
export async function GET(request: Request) {
  try {
    const organiser = await getOrganiserFromSession();
    
    if (!organiser) {
      return NextResponse.json({
        authenticated: false,
        message: 'No organiser found in session',
      });
    }

    // Check if organiser exists in database
    const dbOrganiser = await prisma.organiser.findUnique({
      where: { id: organiser.id },
    });

    return NextResponse.json({
      authenticated: true,
      organiser: {
        id: organiser.id,
        email: organiser.email,
        name: organiser.name,
        role: organiser.role,
        isActive: organiser.isActive,
      },
      existsInDb: !!dbOrganiser,
      dbOrganiser: dbOrganiser ? {
        id: dbOrganiser.id,
        email: dbOrganiser.email,
        isActive: dbOrganiser.isActive,
      } : null,
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
