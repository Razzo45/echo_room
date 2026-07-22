import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getLevelForUser } from '@/lib/xp';

/**
 * GET /api/companions — people you've completed a story room with + shared artifacts.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const eventId = user.eventId;

    const memberships = await prisma.roomMember.findMany({
      where: {
        userId: user.id,
        room: { eventId, status: 'COMPLETED' },
      },
      include: {
        room: {
          select: {
            id: true,
            roomCode: true,
            isPrivate: true,
            completedAt: true,
            quest: { select: { name: true } },
            artifact: { select: { id: true, shareToken: true } },
            members: {
              where: { userId: { not: user.id } },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    organisation: true,
                    role: true,
                    headline: true,
                    country: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { room: { completedAt: 'desc' } },
    });

    const byCompanion = new Map<
      string,
      {
        id: string;
        name: string;
        organisation: string;
        role: string;
        headline: string | null;
        country: string;
        sharedRooms: Array<{
          roomId: string;
          questName: string;
          isPrivate: boolean;
          artifactId: string | null;
          completedAt: string | null;
        }>;
      }
    >();

    for (const m of memberships) {
      for (const other of m.room.members) {
        const u = other.user;
        if (!byCompanion.has(u.id)) {
          byCompanion.set(u.id, {
            id: u.id,
            name: u.name,
            organisation: u.organisation,
            role: u.role,
            headline: u.headline,
            country: u.country,
            sharedRooms: [],
          });
        }
        byCompanion.get(u.id)!.sharedRooms.push({
          roomId: m.room.id,
          questName: m.room.quest.name,
          isPrivate: m.room.isPrivate,
          artifactId: m.room.artifact?.id ?? null,
          completedAt: m.room.completedAt?.toISOString() ?? null,
        });
      }
    }

    const level = await getLevelForUser(user.id);

    return NextResponse.json({
      me: {
        id: user.id,
        name: user.name,
        organisation: user.organisation,
        role: user.role,
        levelLabel: level.label,
      },
      companions: [...byCompanion.values()],
      count: byCompanion.size,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Companions GET error:', error);
    return NextResponse.json({ error: 'Failed to load companions' }, { status: 500 });
  }
}
