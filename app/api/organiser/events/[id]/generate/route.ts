import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { generateEventRooms } from '@/lib/ai/generateEventRooms';

/**
 * POST /api/organiser/events/[id]/generate
 * Generate event rooms (quests, decisions, options) using AI
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganiserAuth();

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
        model: 'gpt-4o-mini',
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

      // Now do all database operations in a transaction
      // This should be fast since AI generation is already done
      // Set timeout to 30 seconds to handle large generations
      await prisma.$transaction(async (tx) => {
        // Delete existing AI-generated quests for this event (if any)
        // Use cascade deletes where possible to be more efficient
        const existingGenerations = await tx.eventGeneration.findMany({
          where: { 
            eventId,
            id: { not: generation.id }, // Exclude current generation
          },
          select: { id: true },
        });

        // Delete all quests from previous generations (cascade will handle decisions/options)
        if (existingGenerations.length > 0) {
          const oldGenerationIds = existingGenerations.map(g => g.id);
          await tx.quest.deleteMany({
            where: {
              eventGenerationId: { in: oldGenerationIds },
            },
          });

          // Delete old generations
          await tx.eventGeneration.deleteMany({
            where: {
              id: { in: oldGenerationIds },
            },
          });
        }

        // Create regions and quests efficiently
        // First, get all existing regions for this event (single query)
        const existingRegions = await tx.region.findMany({
          where: { eventId },
          select: { id: true, name: true },
        });
        
        const existingRegionMap = new Map(existingRegions.map(r => [r.name, r.id]));
        let sortOrder = 0;

        // Process regions sequentially but efficiently
        for (const regionData of generated.regions) {
          let regionId = existingRegionMap.get(regionData.name);
          
          if (!regionId) {
            // Create new region
            const newRegion = await tx.region.create({
              data: {
                eventId,
                name: regionData.name,
                displayName: regionData.displayName,
                description: regionData.description || null,
                isActive: true,
                sortOrder: sortOrder++,
              },
            });
            regionId = newRegion.id;
            existingRegionMap.set(regionData.name, regionId);
          } else {
            // Update existing region
            await tx.region.update({
              where: { id: regionId },
              data: {
                displayName: regionData.displayName,
                description: regionData.description || null,
              },
            });
          }

          // Create quests for this region
          for (const questData of regionData.quests) {
            const quest = await tx.quest.create({
              data: {
                regionId,
                name: questData.name,
                description: questData.description,
                questType: 'DECISION_ROOM',
                durationMinutes: questData.durationMinutes,
                teamSize: questData.teamSize,
                isActive: true,
                sortOrder: 0,
                eventGenerationId: generation.id,
              },
            });

            // Create all decisions for this quest
            for (const decisionData of questData.decisions) {
              const decision = await tx.questDecision.create({
                data: {
                  questId: quest.id,
                  decisionNumber: decisionData.decisionNumber,
                  title: decisionData.title,
                  context: decisionData.context,
                  sortOrder: decisionData.decisionNumber,
                },
              });

              // Create all options for this decision (sequential to avoid transaction timeout)
              for (const optionData of decisionData.options) {
                await tx.questOption.create({
                  data: {
                    decisionId: decision.id,
                    optionKey: optionData.optionKey,
                    title: optionData.title,
                    description: optionData.description,
                    impact: optionData.impact,
                    tradeoff: optionData.tradeoff,
                  },
                });
              }
            }
          }
        }

        // Update EventGeneration with output and mark as READY
        await tx.eventGeneration.update({
          where: { id: generation.id },
          data: {
            status: 'READY',
            output: generated as any, // Store the validated output
          },
        });

        // Update Event with generation status
        await tx.event.update({
          where: { id: eventId },
          data: {
            aiGenerationStatus: 'READY',
            aiGeneratedAt: new Date(),
            aiGenerationVersion: 'v1',
          },
        });
      }, {
        timeout: 30000, // 30 second timeout for large transactions
      });

      return NextResponse.json({
        success: true,
        message: 'Event rooms generated successfully',
        generationId: generation.id,
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

      // Try to update generation status (may fail if transaction already rolled back)
      try {
        await prisma.eventGeneration.update({
          where: { id: generation.id },
          data: {
            status: 'FAILED',
            error: errorMessage.substring(0, 1000), // Limit error length
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
  } catch (error) {
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
