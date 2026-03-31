import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateArtifact } from '@/lib/artifact';
import { isStoryStateColumnMissing, normalizeStoryState } from '@/lib/story-runtime';
import { generateFinalSynthesisWithFallback } from '@/lib/story-synthesis';
import { checkRoomCompletionBadges } from '@/lib/badges';

/**
 * POST /api/room/[id]/complete
 * Mark the current participant as having finished the final panel.
 * The room stays in play until everyone has tapped "Finish story"; only then we
 * mark the room COMPLETED, run final synthesis if needed, and create the artifact.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const roomId = params.id;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        artifact: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const membership = room.members.find((m) => m.userId === user.id);
    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this room' },
        { status: 403 }
      );
    }

    const storyState = (room.storyState ?? null) as { phase?: string } | null;
    const runtimeAllowsCompletion =
      storyState?.phase === 'final_panel' ||
      storyState?.phase === 'completed' ||
      room.status === 'COMPLETED';
    if (!runtimeAllowsCompletion) {
      return NextResponse.json(
        { error: 'Room is not yet completed' },
        { status: 400 }
      );
    }
    const finalSynthesisReady =
      String((storyState as { finalSynthesis?: { status?: string } } | null)?.finalSynthesis?.status || '') ===
        'done' &&
      String((storyState as { finalSynthesis?: { text?: string } } | null)?.finalSynthesis?.text || '').trim()
        .length > 0;
    if (room.status !== 'COMPLETED' && !finalSynthesisReady) {
      return NextResponse.json(
        { error: 'Final synthesis is still being prepared. Please wait a moment and retry.' },
        { status: 409 }
      );
    }

    if (!membership.completedAt) {
      await prisma.roomMember.update({
        where: { id: membership.id },
        data: { completedAt: new Date() },
      });
    }

    const updatedMembers = await prisma.roomMember.findMany({
      where: { roomId },
    });

    const allCompleted = updatedMembers.every((m) => m.completedAt !== null);

    let artifactId: string | null = room.artifact ? room.artifact.id : null;

    let artifactError: string | null = null;

    if (allCompleted) {
      const memberIds = updatedMembers.map((m) => m.userId);
      const roomFresh = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          event: true,
          quest: true,
          members: { include: { user: true } },
          artifact: true,
        },
      });

      if (roomFresh) {
        const currentState = normalizeStoryState(roomFresh.storyState, memberIds);
        currentState.phase = 'completed';
        if (
          !String(currentState.finalSynthesis?.text || '').trim() ||
          currentState.finalSynthesis?.status === 'pending'
        ) {
          const synthesis = await generateFinalSynthesisWithFallback(
            currentState,
            roomFresh.members.map((member) => ({
              id: member.userId,
              name: member.user.name,
            })),
            {
              name: roomFresh.quest.name || 'Collaborative Scenario',
              description: roomFresh.quest.description || roomFresh.event?.aiBrief || '',
            }
          );
          currentState.finalSynthesis = {
            status: 'done',
            text: synthesis.text,
            mode: synthesis.mode,
          };
        }

        await prisma.room.update({
          where: { id: roomId },
          data: {
            status: 'COMPLETED',
            completedAt: roomFresh.completedAt ?? new Date(),
            storyState: currentState,
            lastActivityAt: new Date(),
          },
        });

        artifactId = roomFresh.artifact?.id ?? null;

        if (!artifactId) {
          try {
            const artifact = await generateArtifact(roomId);
            artifactId = artifact.id;
            await prisma.room.update({
              where: { id: roomId },
              data: { lastActivityAt: new Date() },
            });
          } catch (generationError) {
            artifactError =
              generationError instanceof Error ? generationError.message : 'Artifact generation failed';
            console.error('Artifact generation failed during completion:', generationError);
          }
        }
        // Award d20-gameplay badges (fire-and-forget)
        checkRoomCompletionBadges(roomId).catch((err) =>
          console.error('Badge check error:', err)
        );
      } else {
        console.error('Complete: room disappeared during synthesis step', roomId);
      }
    } else {
      await prisma.room.update({
        where: { id: roomId },
        data: { lastActivityAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      allCompleted,
      artifactId,
      artifactGenerationFailed: artifactError !== null,
      artifactGenerationError: artifactError,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isStoryStateColumnMissing(error)) {
      return NextResponse.json(
        { error: 'Runtime state migration is pending. Please run database migrations and retry.' },
        { status: 503 }
      );
    }
    console.error('Complete room error:', error);
    return NextResponse.json(
      { error: 'An error occurred while marking completion' },
      { status: 500 }
    );
  }
}
