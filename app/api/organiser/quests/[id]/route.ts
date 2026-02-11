import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { requireOrganiserQuestAccess } from '@/lib/event-access';

// GET /api/organiser/quests/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();

    const quest = await prisma.quest.findFirst({
      where: {
        id: params.id,
        region: {
          event: organiser.role === 'SUPER_ADMIN'
            ? {}
            : { organiserId: organiser.id },
        },
      },
      include: {
        region: true,
        decisions: {
          include: {
            options: true,
          },
          orderBy: { decisionNumber: 'asc' },
        },
        fields: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!quest) {
      return NextResponse.json(
        { error: 'Quest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ quest });
  } catch (error) {
    console.error('Get quest error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quest' },
      { status: 500 }
    );
  }
}

// PUT /api/organiser/quests/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();
    await requireOrganiserQuestAccess(organiser, params.id);

    const body = await request.json();
    const {
      name,
      description,
      durationMinutes,
      teamSize,
      minTeamSize,
      sortOrder,
      isActive,
      decisions,
    } = body as {
      name?: string;
      description?: string;
      durationMinutes?: number;
      teamSize?: number;
      minTeamSize?: number;
      sortOrder?: number;
      isActive?: boolean;
      decisions?: Array<{
        id: string;
        title?: string;
        context?: string;
        options?: Array<{
          id: string;
          title?: string;
          description?: string;
          impact?: string;
          tradeoff?: string;
        }>;
      }>;
    };

    const quest = await prisma.$transaction(async (tx) => {
      // Update top-level quest fields
      await tx.quest.update({
        where: { id: params.id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(durationMinutes !== undefined && { durationMinutes }),
          ...(teamSize !== undefined && { teamSize }),
          ...(minTeamSize !== undefined && { minTeamSize }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(isActive !== undefined && { isActive }),
          // Clear deprecated decisionsData so API builds from QuestDecision/QuestOption
          ...(Array.isArray(decisions) && decisions.length > 0
            ? { decisionsData: null }
            : {}),
        },
      });

      // Apply nested decision/option updates if provided
      if (Array.isArray(decisions) && decisions.length > 0) {
        for (const d of decisions) {
          if (!d.id) continue;

          // Ensure decision belongs to this quest
          const existingDecision = await tx.questDecision.findFirst({
            where: {
              id: d.id,
              questId: params.id,
            },
          });
          if (!existingDecision) continue;

          await tx.questDecision.update({
            where: { id: d.id },
            data: {
              ...(d.title !== undefined && { title: d.title }),
              ...(d.context !== undefined && { context: d.context }),
            },
          });

          if (Array.isArray(d.options) && d.options.length > 0) {
            for (const o of d.options) {
              if (!o.id) continue;
              await tx.questOption.updateMany({
                where: {
                  id: o.id,
                  decisionId: d.id,
                },
                data: {
                  ...(o.title !== undefined && { title: o.title }),
                  ...(o.description !== undefined && { description: o.description }),
                  ...(o.impact !== undefined && { impact: o.impact }),
                  ...(o.tradeoff !== undefined && { tradeoff: o.tradeoff }),
                },
              });
            }
          }
        }
      }

      // Return full quest with decisions/options for editor
      return tx.quest.findUnique({
        where: { id: params.id },
        include: {
          region: true,
          decisions: {
            include: { options: true },
            orderBy: { decisionNumber: 'asc' },
          },
          fields: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    return NextResponse.json({ quest });
  } catch (error: any) {
    if (error?.status === 404) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update quest error:', error);
    return NextResponse.json(
      { error: 'Failed to update quest' },
      { status: 500 }
    );
  }
}

// DELETE /api/organiser/quests/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organiser = await requireOrganiserAuth();
    await requireOrganiserQuestAccess(organiser, params.id);

    await prisma.quest.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.status === 404) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete quest error:', error);
    return NextResponse.json(
      { error: 'Failed to delete quest' },
      { status: 500 }
    );
  }
}
