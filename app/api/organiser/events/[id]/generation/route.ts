import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

/**
 * GET /api/organiser/events/[id]/generation
 * Get latest generation status for an event
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();

    const eventId = params.id;

    // Fetch event with latest generation
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        ...(organiser.role === 'SUPER_ADMIN'
          ? {}
          : { organiserId: organiser.id }),
      },
      include: {
        generations: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Latest generation only
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const latestGeneration = event.generations[0] || null;

    return NextResponse.json({
      status: event.aiGenerationStatus,
      generatedAt: event.aiGeneratedAt,
      version: event.aiGenerationVersion,
      generation: latestGeneration
        ? {
            id: latestGeneration.id,
            status: latestGeneration.status,
            model: latestGeneration.model,
            error: latestGeneration.error,
            createdAt: latestGeneration.createdAt,
            updatedAt: latestGeneration.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Get generation status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generation status' },
      { status: 500 }
    );
  }
}
