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

    if (!event.aiBrief) {
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
      // Call AI generation
      const generated = await generateEventRooms({
        brief: event.aiBrief,
        eventName: event.name,
        eventDescription: event.description || undefined,
      });

      // Use Prisma transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Delete existing AI-generated quests for this event (if any)
        // Find all quests linked to previous generations for this event
        const existingGenerations = await tx.eventGeneration.findMany({
          where: { eventId },
          include: { quests: true },
        });

        // Delete all quests from previous generations
        for (const gen of existingGenerations) {
          if (gen.quests.length > 0) {
            // Delete decisions and options first (cascade should handle this, but being explicit)
            for (const quest of gen.quests) {
              const decisions = await tx.questDecision.findMany({
                where: { questId: quest.id },
              });
              for (const decision of decisions) {
                await tx.questOption.deleteMany({
                  where: { decisionId: decision.id },
                });
              }
              await tx.questDecision.deleteMany({
                where: { questId: quest.id },
              });
            }
            await tx.quest.deleteMany({
              where: { eventGenerationId: gen.id },
            });
          }
        }

        // Delete old generations (keep only the latest)
        await tx.eventGeneration.deleteMany({
          where: {
            eventId,
            id: { not: generation.id },
          },
        });

        // Create regions and quests
        let sortOrder = 0;
        for (const regionData of generated.regions) {
          // Check if region already exists for this event
          let region = await tx.region.findFirst({
            where: {
              eventId,
              name: regionData.name,
            },
          });

          if (!region) {
            // Create new region
            region = await tx.region.create({
              data: {
                eventId,
                name: regionData.name,
                displayName: regionData.displayName,
                description: regionData.description || null,
                isActive: true,
                sortOrder: sortOrder++,
              },
            });
          } else {
            // Update existing region
            region = await tx.region.update({
              where: { id: region.id },
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
                regionId: region.id,
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

            // Create decisions for this quest
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

              // Create options for this decision
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
      });

      return NextResponse.json({
        success: true,
        message: 'Event rooms generated successfully',
        generationId: generation.id,
      });
    } catch (error) {
      // Update generation status to FAILED
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await prisma.eventGeneration.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          error: errorMessage,
        },
      });

      await prisma.event.update({
        where: { id: eventId },
        data: { aiGenerationStatus: 'FAILED' },
      });

      console.error('AI generation error:', error);

      return NextResponse.json(
        {
          error: 'Failed to generate event rooms',
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Generate event rooms error:', error);
    return NextResponse.json(
      { error: 'An error occurred during generation' },
      { status: 500 }
    );
  }
}
