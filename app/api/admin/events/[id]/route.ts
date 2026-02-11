import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireSuperAdminAuth } from '@/lib/auth-organiser';
import { logAdminAction } from '@/lib/admin-audit';

/**
 * PATCH /api/admin/events/[id] – Super Admin only.
 * Body: { debugMode?: boolean }. Updates event.debugMode for platform testing without LLM/cost.
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

    // If no change, nothing to do
    if (event.debugMode === debugMode) {
      return NextResponse.json({ success: true });
    }

    // Turning debug ON: capture a snapshot of current event state (config + data)
    if (debugMode) {
      // Only capture snapshot if we don't already have one
      if (!event.debugSnapshot) {
        const [
          eventCodes,
          users,
          sessions,
          regions,
          rooms,
          analyticsEvents,
          userBadges,
        ] = await Promise.all([
          prisma.eventCode.findMany({ where: { eventId } }),
          prisma.user.findMany({ where: { eventId } }),
          prisma.session.findMany({
            where: {
              eventCode: { eventId },
            },
          }),
          prisma.region.findMany({
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
          }),
          prisma.room.findMany({
            where: { eventId },
            include: {
              members: true,
              votes: true,
              commits: true,
              artifact: true,
            },
          }),
          prisma.analyticsEvent.findMany({
            where: { eventId },
          }),
          prisma.userBadge.findMany({
            where: {
              user: {
                eventId,
              },
            },
          }),
        ]);

        // QuestResponses: need questIds for this event (no direct relation in schema)
        const questsForEvent = await prisma.quest.findMany({
          where: {
            region: {
              eventId,
            },
          },
          select: { id: true },
        });
        const questResponses = await prisma.questResponse.findMany({
          where: {
            questId: {
              in: questsForEvent.map((q) => q.id),
            },
          },
        });

        const snapshot = {
          event: {
            aiBrief: event.aiBrief,
            aiGenerationStatus: event.aiGenerationStatus,
            aiGeneratedAt: event.aiGeneratedAt,
            aiGenerationVersion: event.aiGenerationVersion,
          },
          eventCodes,
          users,
          sessions,
          regions,
          rooms,
          questResponses,
          analyticsEvents,
          userBadges,
        };

        await prisma.event.update({
          where: { id: eventId },
          data: {
            debugMode: true,
            debugSnapshot: snapshot as any,
          },
        });
      } else {
        await prisma.event.update({
          where: { id: eventId },
          data: { debugMode: true },
        });
      }
    } else {
      // Turning debug OFF: restore from snapshot if present
      if (!event.debugSnapshot) {
        await prisma.event.update({
          where: { id: eventId },
          data: { debugMode: false },
        });
      } else {
        const snapshot: any = event.debugSnapshot;

        await prisma.$transaction(async (tx) => {
          // Remove current event data (config + participants + rooms + telemetry)
          await tx.analyticsEvent.deleteMany({
            where: { eventId },
          });

          const questsForEvent = await tx.quest.findMany({
            where: {
              region: {
                eventId,
              },
            },
            select: { id: true },
          });

          await tx.questResponse.deleteMany({
            where: {
              questId: {
                in: questsForEvent.map((q) => q.id),
              },
            },
          });

          await tx.room.deleteMany({
            where: { eventId },
          });

          await tx.session.deleteMany({
            where: {
              eventCode: {
                eventId,
              },
            },
          });

          await tx.user.deleteMany({
            where: { eventId },
          });

          await tx.eventCode.deleteMany({
            where: { eventId },
          });

          await tx.questOption.deleteMany({
            where: {
              decision: {
                quest: {
                  region: {
                    eventId,
                  },
                },
              },
            },
          });

          await tx.questDecision.deleteMany({
            where: {
              quest: {
                region: {
                  eventId,
                },
              },
            },
          });

          await tx.questField.deleteMany({
            where: {
              quest: {
                region: {
                  eventId,
                },
              },
            },
          });

          await tx.quest.deleteMany({
            where: {
              region: {
                eventId,
              },
            },
          });

          await tx.region.deleteMany({
            where: { eventId },
          });

          await tx.eventGeneration.deleteMany({
            where: { eventId },
          });

          // Recreate core data from snapshot (IDs preserved)
          if (Array.isArray(snapshot.eventCodes)) {
            await tx.eventCode.createMany({
              data: snapshot.eventCodes,
            });
          }

          if (Array.isArray(snapshot.users)) {
            await tx.user.createMany({
              data: snapshot.users,
            });
          }

          if (Array.isArray(snapshot.sessions)) {
            await tx.session.createMany({
              data: snapshot.sessions,
            });
          }

          if (Array.isArray(snapshot.regions)) {
            for (const region of snapshot.regions) {
              await tx.region.create({
                data: {
                  id: region.id,
                  eventId,
                  name: region.name,
                  displayName: region.displayName,
                  description: region.description ?? null,
                  isActive: region.isActive ?? true,
                  sortOrder: region.sortOrder ?? 0,
                },
              });

              if (Array.isArray(region.quests)) {
                for (const quest of region.quests) {
                  await tx.quest.create({
                    data: {
                      id: quest.id,
                      regionId: quest.regionId,
                      name: quest.name,
                      description: quest.description,
                      questType: quest.questType ?? 'DECISION_ROOM',
                      durationMinutes: quest.durationMinutes,
                      teamSize: quest.teamSize,
                      sortOrder: quest.sortOrder ?? 0,
                      isActive: quest.isActive ?? true,
                      eventGenerationId: null,
                    },
                  });

                  if (Array.isArray(quest.fields)) {
                    for (const field of quest.fields) {
                      await tx.questField.create({
                        data: {
                          id: field.id,
                          questId: field.questId,
                          fieldKey: field.fieldKey,
                          label: field.label,
                          fieldType: field.fieldType,
                          placeholder: field.placeholder ?? null,
                          required: field.required ?? false,
                          options: field.options ?? null,
                          sortOrder: field.sortOrder ?? 0,
                        },
                      });
                    }
                  }

                  if (Array.isArray(quest.decisions)) {
                    for (const decision of quest.decisions) {
                      await tx.questDecision.create({
                        data: {
                          id: decision.id,
                          questId: decision.questId,
                          decisionNumber: decision.decisionNumber,
                          title: decision.title,
                          context: decision.context ?? '',
                          sortOrder: decision.sortOrder ?? decision.decisionNumber,
                        },
                      });

                      if (Array.isArray(decision.options)) {
                        for (const option of decision.options) {
                          await tx.questOption.create({
                            data: {
                              id: option.id,
                              decisionId: option.decisionId,
                              optionKey: option.optionKey,
                              title: option.title,
                              description: option.description ?? '',
                              impact: option.impact ?? '',
                              tradeoff: option.tradeoff ?? '',
                            },
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          if (Array.isArray(snapshot.rooms)) {
            for (const room of snapshot.rooms) {
              await tx.room.create({
                data: {
                  id: room.id,
                  eventId: room.eventId,
                  questId: room.questId,
                  roomCode: room.roomCode,
                  status: room.status,
                  currentDecision: room.currentDecision,
                  startedAt: room.startedAt ?? null,
                  completedAt: room.completedAt ?? null,
                },
              });

              if (Array.isArray(room.members)) {
                for (const member of room.members) {
                  await tx.roomMember.create({
                    data: {
                      id: member.id,
                      roomId: member.roomId,
                      userId: member.userId,
                      joinedAt: member.joinedAt,
                    },
                  });
                }
              }

              if (Array.isArray(room.commits)) {
                for (const commit of room.commits) {
                  await tx.decisionCommit.create({
                    data: {
                      id: commit.id,
                      roomId: commit.roomId,
                      decisionNumber: commit.decisionNumber,
                      committedOption: commit.committedOption,
                      createdAt: commit.createdAt,
                    },
                  });
                }
              }

              if (Array.isArray(room.votes)) {
                for (const vote of room.votes) {
                  await tx.vote.create({
                    data: {
                      id: vote.id,
                      roomId: vote.roomId,
                      userId: vote.userId,
                      decisionNumber: vote.decisionNumber,
                      optionKey: vote.optionKey,
                      justification: vote.justification,
                      createdAt: vote.createdAt,
                    },
                  });
                }
              }

              if (room.artifact) {
                await tx.artifact.create({
                  data: {
                    id: room.artifact.id,
                    roomId: room.artifact.roomId,
                    htmlContent: room.artifact.htmlContent,
                    pdfPath: room.artifact.pdfPath ?? null,
                    pdfContent: room.artifact.pdfContent ?? null,
                    shareToken: room.artifact.shareToken ?? null,
                    createdAt: room.artifact.createdAt,
                  },
                });
              }
            }
          }

          if (Array.isArray(snapshot.userBadges)) {
            await tx.userBadge.createMany({
              data: snapshot.userBadges,
            });
          }

          if (Array.isArray(snapshot.questResponses)) {
            await tx.questResponse.createMany({
              data: snapshot.questResponses,
            });
          }

          if (Array.isArray(snapshot.analyticsEvents)) {
            await tx.analyticsEvent.createMany({
              data: snapshot.analyticsEvents,
            });
          }

          // Restore basic event AI fields and disable debug
          const e = snapshot.event ?? {};
          await tx.event.update({
            where: { id: eventId },
            data: {
              debugMode: false,
              debugSnapshot: Prisma.DbNull,
              aiBrief: e.aiBrief ?? null,
              aiGenerationStatus: e.aiGenerationStatus ?? 'IDLE',
              aiGeneratedAt: e.aiGeneratedAt ? new Date(e.aiGeneratedAt) : null,
              aiGenerationVersion: e.aiGenerationVersion ?? null,
            },
          });
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
