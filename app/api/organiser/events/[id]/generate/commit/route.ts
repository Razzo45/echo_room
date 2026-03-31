import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { requireOrganiserEventAccess } from '@/lib/event-access';
import { EventGenerationOutputSchema } from '@/lib/ai/schemas';

export const maxDuration = 60;

/**
 * POST /api/organiser/events/[id]/generate/commit
 * Commit reviewed/edited AI-generated content to database
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();
    const event = await requireOrganiserEventAccess(organiser, params.id);
    const eventId = event.id;
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

    const normalizeDraft = (raw: typeof validation.data) => {
      const optionKeys: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
      return {
        ...raw,
        regions: raw.regions.map((region) => ({
          ...region,
          quests: region.quests.map((quest) => ({
            ...quest,
            decisions: quest.decisions.slice(0, 5).map((decision, decisionIdx) => ({
              ...decision,
              decisionNumber: (decisionIdx + 1) as 1 | 2 | 3 | 4 | 5,
              options: decision.options.slice(0, 3).map((option, optionIdx) => ({
                ...option,
                optionKey: optionKeys[optionIdx],
              })),
            })),
          })),
        })),
      };
    };

    const generated = normalizeDraft(validation.data);

    // Enforce a minimum amount of AI-generated quests for this event
    // to avoid committing a trivial single-quest configuration.
    const totalQuests =
      generated.regions?.reduce((sum, region) => sum + region.quests.length, 0) ?? 0;
    if (totalQuests < 2) {
      return NextResponse.json(
        {
          error:
            'Too few quests generated. Please regenerate or edit the draft so there are at least 2 quests before committing.',
          details: { totalQuests },
        },
        { status: 400 }
      );
    }

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
    await prisma.$transaction(async (tx) => {
      // NOTE: Keep commit lightweight for serverless reliability.
      // We no longer hard-delete historical generations/quests in-line because
      // that can exceed function limits on Vercel and fail user commits.
      // Existing historical data remains for audit/history and can be cleaned
      // up by a dedicated maintenance path later.
      const existingGenerations = await tx.eventGeneration.findMany({
        where: {
          eventId,
          id: { not: generation.id },
        },
        select: { id: true },
      });
      const hasHistoricalGenerations = existingGenerations.length > 0;

      // Create regions and quests
      const existingRegions = await tx.region.findMany({
        where: { eventId },
        select: { id: true, name: true },
      });

      const existingRegionMap = new Map(existingRegions.map(r => [r.name, r.id]));
      let sortOrder = 0;

      for (const regionData of generated.regions) {
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

      // Update EventGeneration status to READY and store final output
      await tx.eventGeneration.update({
        where: { id: generation.id },
        data: {
          status: 'READY',
          output: generated as unknown as Prisma.InputJsonValue,
        },
      });

      // Update Event status to READY
      await tx.event.update({
        where: { id: eventId },
        data: {
          aiGenerationStatus: 'READY',
          aiGeneratedAt: new Date(),
          aiGenerationVersion: 'v1',
        },
      });
    }, {
      timeout: 120000,
    });

    return NextResponse.json({
      success: true,
      message: 'Content committed successfully',
      generationId: generation.id,
      note: 'Historical generated content was preserved for reliability and audit history.',
    });
  } catch (error: unknown) {
    const httpStatus =
      error && typeof error === 'object' && 'status' in error
        ? (error as { status?: number }).status
        : undefined;
    if (httpStatus === 404) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    console.error('Commit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to commit content',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
