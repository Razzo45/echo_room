import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth-organiser';

export async function GET() {
  try {
    await requireAdminAuth();

    const events = await prisma.event.findMany({
      include: {
        _count: {
          select: {
            users: true,
            rooms: true,
            eventCodes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ events });
  } catch (error: any) {
    if (error.message === 'Admin authentication required' || error.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin get events error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
