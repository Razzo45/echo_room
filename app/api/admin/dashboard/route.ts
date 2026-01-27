import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth, getCurrentOrganiser } from '@/lib/auth-organiser';

export async function GET() {
  try {
    const currentUser = await requireAdminAuth();

    // Get statistics
    const [events, organisers, participants, rooms, activeRooms] = await Promise.all([
      prisma.event.count(),
      prisma.organiser.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.room.count(),
      prisma.room.count({ where: { status: { in: ['OPEN', 'FULL', 'IN_PROGRESS'] } } }),
    ]);

    return NextResponse.json({
      stats: {
        events,
        organisers,
        participants,
        rooms,
        activeRooms,
      },
      currentUser: {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
      },
    });
  } catch (error: any) {
    if (error.message === 'Admin authentication required' || error.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
