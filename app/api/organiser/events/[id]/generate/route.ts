import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { requireOrganiserEventAccess } from '@/lib/event-access';
import { generateEventRooms } from '@/lib/ai/generateEventRooms';

/**
 * POST /api/organiser/events/[id]/generate
 * Generate event rooms (quests, decisions, options) using AI
 * Returns DRAFT status - content must be reviewed and committed via /generate/commit
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();
    await requireOrganiserEventAccess(organiser, params.id);

    // Check OpenAI API key early
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        { 
          error: 'OpenAI API key is not configured',
          details: 'Please set OPENAI_API_KEY environment variable'
        },
        { status: 500 }
      );
    }

    const eventId = params.id;

    // Fetch event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (!event.aiBrief || !event.aiBrief.trim()) {
      return NextResponse.json(
        { error: 'AI brief is required. Please add an AI brief to the event first.' },
        { status: 400 }
      );
    }

    // Check if already generating
    if (event.aiGenerationStatus === 'GENERATING') {
      return NextResponse.json(
        { error: 'Generation already in progress' },
        { status: 409 }
      );
    }

    // Update event status to GENERATING
    await prisma.event.update({
      where: { id: eventId },
      data: { aiGenerationStatus: 'GENERATING' },
    });

    // Create EventGeneration record with input snapshot
    const generation = await prisma.eventGeneration.create({
      data: {
        eventId,
        status: 'GENERATING',
        input: {
          brief: event.aiBrief,
          eventName: event.name,
          eventDescription: event.description,
        },
        model: 'gpt-4o',
      },
    });

    try {
      console.log('Starting AI generation for event:', eventId);
      
      // Call AI generation FIRST (outside transaction to avoid timeout)
      // This can take 10-30 seconds, so we don't want it inside a transaction
      const generated = await generateEventRooms({
        brief: event.aiBrief,
        eventName: event.name,
        eventDescription: event.description || undefined,
      });

      console.log('AI generation completed, regions:', generated.regions.length);

      // Store draft in EventGeneration.output and set status to DRAFT (not READY)
      // This allows organiser to review/edit before committing to database
      await prisma.eventGeneration.update({
        where: { id: generation.id },
        data: {
          status: 'DRAFT',
          output: generated as any,
        },
      });

      // Update Event status to DRAFT (awaiting review)
      await prisma.event.update({
        where: { id: eventId },
        data: { aiGenerationStatus: 'DRAFT' },
      });

      console.log('Draft saved, awaiting organiser review');

      // Return the generated content for review
      return NextResponse.json({
        success: true,
        message: 'AI generation completed. Please review and confirm.',
        generationId: generation.id,
        draft: generated, // Return the generated content for review
        status: 'DRAFT',
      });
    } catch (error) {
      // Update generation status to FAILED
      let errorMessage = 'Unknown error';
      let errorDetails = '';

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      console.error('AI generation error:', {
        message: errorMessage,
        details: errorDetails,
        eventId,
        generationId: generation.id,
      });

      // Try to update generation status
      try {
        await prisma.eventGeneration.update({
          where: { id: generation.id },
          data: {
            status: 'FAILED',
            error: errorMessage.substring(0, 1000),
          },
        });

        await prisma.event.update({
          where: { id: eventId },
          data: { aiGenerationStatus: 'FAILED' },
        });
      } catch (updateError) {
        console.error('Failed to update generation status:', updateError);
      }

      // Return user-friendly error message
      const userMessage = errorMessage.includes('OPENAI_API_KEY')
        ? 'OpenAI API key is not configured. Please contact the administrator.'
        : errorMessage.includes('validation')
        ? 'AI returned invalid content. Please try again with a different brief.'
        : errorMessage.includes('JSON')
        ? 'AI returned invalid JSON. Please try again.'
        : 'Failed to generate event rooms. Please try again.';

      return NextResponse.json(
        {
          error: userMessage,
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error?.status === 404) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    console.error('Generate event rooms outer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'An error occurred during generation',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
