import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { EventGenerationOutputSchema } from '@/lib/ai/schemas';

/**
 * POST /api/organiser/events/[id]/generate/commit
 * Commit reviewed/edited AI-generated content to database
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganiserAuth();

    const eventId = params.id;
    const body = await request.json();
    const { draft } = body; // The reviewed/edited content

    // Validate the draft content
    const validation = EventGenerationOutputSchema.safeParse(draft);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid content structure',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const generated = validation.data;

    // Find the latest DRAFT generation for this event
    const generation = await prisma.eventGeneration.findFirst({
      where: {
        eventId,
        status: 'DRAFT',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!generation) {
      return NextResponse.json(
        { error: 'No draft generation found. Please generate content first.' },
        { status: 404 }
      );
    }

    // Now persist to database in a transaction
    console.log('Committing reviewed content to database...');

    await prisma.$transaction(async (tx) => {
      console.log('Inside commit transaction...');

      // Delete existing AI-generated quests for this event (if any)
      const existingGenerations = await tx.eventGeneration.findMany({
        where: {
          eventId,
          id: { not: generation.id },
        },
        select: { id: true },
      });

      if (existingGenerations.length > 0) {
        const oldGenerationIds = existingGenerations.map(g => g.id);
        await tx.quest.deleteMany({
          where: {
            eventGenerationId: { in: oldGenerationIds },
          },
        });

        await tx.eventGeneration.deleteMany({
          where: {
            id: { in: oldGenerationIds },
          },
        });
      }

      // Create regions and quests
      console.log('Fetching existing regions...');
      const existingRegions = await tx.region.findMany({
        where: { eventId },
        select: { id: true, name: true },
      });

      console.log('Found existing regions:', existingRegions.length);
      const existingRegionMap = new Map(existingRegions.map(r => [r.name, r.id]));
      let sortOrder = 0;
      let totalQuestsCreated = 0;

      for (const regionData of generated.regions) {
        console.log(`Processing region: ${regionData.name} with ${regionData.quests.length} quests`);
        let regionId = existingRegionMap.get(regionData.name);

        if (!regionId) {
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
          await tx.region.update({
            where: { id: regionId },
            data: {
              displayName: regionData.displayName,
              description: regionData.description || null,
            },
          });
        }

        for (const questData of regionData.quests) {
          try {
            console.log(`  Creating quest: ${questData.name}`);
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
            totalQuestsCreated++;
            console.log(`    Quest created with ID: ${quest.id}`);

            for (const decisionData of questData.decisions) {
              try {
                const decision = await tx.questDecision.create({
                  data: {
                    questId: quest.id,
                    decisionNumber: decisionData.decisionNumber,
                    title: decisionData.title,
                    context: decisionData.context,
                    sortOrder: decisionData.decisionNumber,
                  },
                });
                console.log(`      Decision ${decisionData.decisionNumber} created`);

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
                console.log(`      Created 3 options for decision ${decisionData.decisionNumber}`);
              } catch (decisionError) {
                console.error(`      Error creating decision ${decisionData.decisionNumber}:`, decisionError);
                throw decisionError;
              }
            }
          } catch (questError) {
            console.error(`  Error creating quest ${questData.name}:`, questError);
            throw questError;
          }
        }
      }

      console.log(`Created ${totalQuestsCreated} quests total`);

      // Update EventGeneration status to READY and store final output
      console.log('Updating EventGeneration status to READY...');
      await tx.eventGeneration.update({
        where: { id: generation.id },
        data: {
          status: 'READY',
          output: generated as any,
        },
      });

      // Update Event status to READY
      console.log('Updating Event status to READY...');
      await tx.event.update({
        where: { id: eventId },
        data: {
          aiGenerationStatus: 'READY',
          aiGeneratedAt: new Date(),
          aiGenerationVersion: 'v1',
        },
      });

      console.log('Commit transaction completed successfully');
    }, {
      timeout: 30000,
    });

    console.log('Commit successful');

    return NextResponse.json({
      success: true,
      message: 'Content committed successfully',
      generationId: generation.id,
    });
  } catch (error) {
    console.error('Commit error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to commit content',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
