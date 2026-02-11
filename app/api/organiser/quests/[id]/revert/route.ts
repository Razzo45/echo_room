import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';
import { EventGenerationOutputSchema } from '@/lib/ai/schemas';

// POST /api/organiser/quests/[id]/revert
// Revert a quest's script back to the AI baseline stored in EventGeneration.output
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganiserAuth();

    const questId = params.id;

    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      include: {
        region: true,
        eventGeneration: true,
      },
    });

    if (!quest) {
      return NextResponse.json(
        { error: 'Quest not found' },
        { status: 404 }
      );
    }

    if (!quest.eventGenerationId || !quest.eventGeneration) {
      return NextResponse.json(
        { error: 'This quest does not have an AI baseline to revert to.' },
        { status: 400 }
      );
    }

    if (!quest.eventGeneration.output) {
      return NextResponse.json(
        { error: 'AI baseline output is missing for this quest.' },
        { status: 400 }
      );
    }

    // Validate and parse baseline output
    const parsed = EventGenerationOutputSchema.safeParse(
      quest.eventGeneration.output
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Stored AI baseline is invalid and cannot be used to revert.' },
        { status: 500 }
      );
    }
    const baseline = parsed.data;

    // Find the baseline region by region.slug name
    const regionSlug = quest.region.name;
    const baselineRegion = baseline.regions.find(
      (r) => r.name === regionSlug
    );
    if (!baselineRegion) {
      return NextResponse.json(
        { error: 'Could not find matching region in AI baseline.' },
        { status: 400 }
      );
    }

    // Determine quest index within this region based on creation order
    const regionQuests = await prisma.quest.findMany({
      where: {
        regionId: quest.regionId,
        eventGenerationId: quest.eventGenerationId,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const questIndex = regionQuests.findIndex((q) => q.id === questId);
    if (questIndex === -1 || questIndex >= baselineRegion.quests.length) {
      return NextResponse.json(
        { error: 'Could not align quest with AI baseline entry.' },
        { status: 400 }
      );
    }

    const baselineQuest = baselineRegion.quests[questIndex];

    const revertedQuest = await prisma.$transaction(async (tx) => {
      // Update quest core fields
      await tx.quest.update({
        where: { id: questId },
        data: {
          name: baselineQuest.name,
          description: baselineQuest.description,
          durationMinutes: baselineQuest.durationMinutes,
          teamSize: baselineQuest.teamSize,
          minTeamSize: (baselineQuest as { minTeamSize?: number }).minTeamSize ?? 2,
          decisionsData: null,
        },
      });

      // Fetch current decisions and options to update in place
      const currentDecisions = await tx.questDecision.findMany({
        where: { questId },
        include: { options: true },
        orderBy: { decisionNumber: 'asc' },
      });

      for (const currentDecision of currentDecisions) {
        const baselineDecision = baselineQuest.decisions.find(
          (d) => d.decisionNumber === currentDecision.decisionNumber
        );
        if (!baselineDecision) continue;

        await tx.questDecision.update({
          where: { id: currentDecision.id },
          data: {
            title: baselineDecision.title,
            context: baselineDecision.context,
          },
        });

        // Update options A/B/C by optionKey
        for (const currentOption of currentDecision.options) {
          const baselineOption = baselineDecision.options.find(
            (o) => o.optionKey === currentOption.optionKey
          );
          if (!baselineOption) continue;

          await tx.questOption.update({
            where: { id: currentOption.id },
            data: {
              title: baselineOption.title,
              description: baselineOption.description,
              impact: baselineOption.impact,
              tradeoff: baselineOption.tradeoff,
            },
          });
        }
      }

      // Return full quest with decisions/options for editor
      return tx.quest.findUnique({
        where: { id: questId },
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

    return NextResponse.json({ quest: revertedQuest });
  } catch (error) {
    console.error('Revert quest error:', error);
    return NextResponse.json(
      { error: 'Failed to revert quest to AI baseline' },
      { status: 500 }
    );
  }
}

