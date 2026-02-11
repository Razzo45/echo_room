import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdminAuth } from '@/lib/auth-organiser';
import { logAdminAction } from '@/lib/admin-audit';

/**
 * PATCH /api/admin/events/[id] – Super Admin only.
 * Body: { debugMode?: boolean }.
 *
 * When enabling debug for an event, we create a dedicated debug clone and route
 * organiser flows to that clone. The original event remains untouched.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireSuperAdminAuth();
    const eventId = params.id;
    const body = await request.json();
    const { debugMode } = body as { debugMode?: boolean };

    if (typeof debugMode !== 'boolean') {
      return NextResponse.json(
        { error: 'debugMode (boolean) is required' },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.isDebugClone) {
      return NextResponse.json(
        { error: 'Cannot toggle debug mode on a debug clone event' },
        { status: 400 }
      );
    }

    // If no change, nothing to do
    if (event.debugMode === debugMode) {
      return NextResponse.json({ success: true });
    }

    if (debugMode) {
      // TURN DEBUG ON – ensure there is a debug clone and point the original at it
      if (event.debugCloneEventId) {
        // Clone already exists – just mark debug enabled
        await prisma.event.update({
          where: { id: eventId },
          data: { debugMode: true },
        });
      } else {
        // Load current structure to clone (config only – no users/rooms/etc.)
        const regions = await prisma.region.findMany({
          where: { eventId },
          orderBy: { sortOrder: 'asc' },
          include: {
            quests: {
              orderBy: { sortOrder: 'asc' },
              include: {
                fields: {
                  orderBy: { sortOrder: 'asc' },
                },
                decisions: {
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    options: {
                      orderBy: { optionKey: 'asc' },
                    },
                  },
                },
              },
            },
          },
        });

        await prisma.$transaction(async (tx) => {
          // Create the debug clone event
          const clone = await tx.event.create({
            data: {
              name: event.name,
              description: event.description,
              organiserId: event.organiserId,
              aiBrief: event.aiBrief,
              aiGenerationStatus: 'IDLE',
              aiGeneratedAt: null,
              aiGenerationVersion: null,
              startDate: event.startDate,
              endDate: event.endDate,
              timezone: event.timezone,
              brandColor: event.brandColor,
              logoUrl: event.logoUrl,
              sponsorLogos: event.sponsorLogos,
              retentionOverride: false,
              retentionOverrideAt: null,
              retentionOverrideBy: null,
              debugMode: true,
              isDebugClone: true,
            },
          });

          const regionIdMap = new Map<string, string>();

          for (const region of regions) {
            const createdRegion = await tx.region.create({
              data: {
                eventId: clone.id,
                name: region.name,
                displayName: region.displayName,
                description: region.description,
                isActive: region.isActive,
                sortOrder: region.sortOrder,
              },
            });
            regionIdMap.set(region.id, createdRegion.id);

            if (Array.isArray(region.quests)) {
              for (const quest of region.quests) {
                const createdQuest = await tx.quest.create({
                  data: {
                    regionId: createdRegion.id,
                    name: quest.name,
                    description: quest.description,
                    questType: quest.questType,
                    durationMinutes: quest.durationMinutes,
                    teamSize: quest.teamSize,
                    sortOrder: quest.sortOrder,
                    isActive: quest.isActive,
                  },
                });

                if (Array.isArray(quest.fields)) {
                  for (const field of quest.fields) {
                    await tx.questField.create({
                      data: {
                        questId: createdQuest.id,
                        fieldKey: field.fieldKey,
                        label: field.label,
                        fieldType: field.fieldType,
                        placeholder: field.placeholder,
                        required: field.required,
                        options: field.options,
                        sortOrder: field.sortOrder,
                      },
                    });
                  }
                }

                if (Array.isArray(quest.decisions)) {
                  for (const decision of quest.decisions) {
                    const createdDecision = await tx.questDecision.create({
                      data: {
                        questId: createdQuest.id,
                        decisionNumber: decision.decisionNumber,
                        title: decision.title,
                        context: decision.context,
                        sortOrder: decision.sortOrder,
                      },
                    });

                    if (Array.isArray(decision.options)) {
                      for (const option of decision.options) {
                        await tx.questOption.create({
                          data: {
                            decisionId: createdDecision.id,
                            optionKey: option.optionKey,
                            title: option.title,
                            description: option.description,
                            impact: option.impact,
                            tradeoff: option.tradeoff,
                          },
                        });
                      }
                    }
                  }
                }
              }
            }
          }

          // Point original event at the clone and enable debug
          await tx.event.update({
            where: { id: event.id },
            data: {
              debugMode: true,
              debugCloneEventId: clone.id,
            },
          });
        });
      }
    } else {
      // TURN DEBUG OFF – delete the debug clone (if any) and clear pointer
      if (event.debugCloneEventId) {
        await prisma.$transaction(async (tx) => {
          await tx.event.delete({
            where: { id: event.debugCloneEventId! },
          });

          await tx.event.update({
            where: { id: event.id },
            data: {
              debugMode: false,
              debugCloneEventId: null,
            },
          });
        });
      } else {
        await prisma.event.update({
          where: { id: event.id },
          data: { debugMode: false },
        });
      }
    }

    await logAdminAction({
      organiserId: organiser.id,
      action: 'event.debug_mode',
      resourceType: 'event',
      resourceId: eventId,
      details: { eventName: event.name, debugMode },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === 'Super admin authentication required' ||
        error.message === 'Super admin access required')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('PATCH admin event error:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}
