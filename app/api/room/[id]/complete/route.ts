import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateArtifact } from '@/lib/artifact';
import { isStoryStateColumnMissing, normalizeStoryState } from '@/lib/story-runtime';
import { generateFinalSynthesisWithFallback } from '@/lib/story-synthesis';

/**
 * POST /api/room/[id]/complete
 * Mark the current participant as having finished the quest.
 * When all room members have completed, generate the artifact (once).
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
    const runtimeAllowsCompletion = storyState?.phase === 'final_panel' || storyState?.phase === 'completed';
    if (room.status !== 'COMPLETED' && !runtimeAllowsCompletion) {
      return NextResponse.json(
        { error: 'Room is not yet completed' },
        { status: 400 }
      );
    }

    if (room.status !== 'COMPLETED') {
      await prisma.room.update({
        where: { id: roomId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          storyState: storyState ? { ...storyState, phase: 'completed' } : undefined,
        },
      });
    }

    // Mark this member as completed
    await prisma.roomMember.update({
      where: { id: membership.id },
      data: { completedAt: new Date() },
    });

    // Re-check all members' completion
    const updatedMembers = await prisma.roomMember.findMany({
      where: { roomId },
    });

    const allCompleted = updatedMembers.every((m) => m.completedAt !== null);

    let artifactId: string | null = room.artifact ? room.artifact.id : null;

    let artifactError: string | null = null;

    if (allCompleted) {
      const memberIds = updatedMembers.map((m) => m.userId);
      // Re-load room so storyState matches DB (avoid clobbering phase with stale in-memory state)
      const roomForSynthesis = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          members: { include: { user: true } },
        },
      });
      if (roomForSynthesis) {
        const currentState = normalizeStoryState(roomForSynthesis.storyState, memberIds);
        currentState.phase = 'completed';
        if (
          !String(currentState.finalSynthesis?.text || '').trim() ||
          currentState.finalSynthesis?.status === 'pending'
        ) {
          const synthesis = await generateFinalSynthesisWithFallback(
            currentState,
            roomForSynthesis.members.map((member) => ({
              id: member.userId,
              name: member.user.name,
            }))
          );
          currentState.finalSynthesis = {
            status: 'done',
            text: synthesis.text,
            mode: synthesis.mode,
          };
          await prisma.room.update({
            where: { id: roomId },
            data: { storyState: currentState, lastActivityAt: new Date() },
          });
        }
      } else {
        console.error('Complete: room disappeared during synthesis step', roomId);
      }
    }

    // Generate artifact only once all members have completed and no artifact exists.
    // Artifact generation must never block completion success.
    if (allCompleted && !artifactId) {
      try {
        const artifact = await generateArtifact(roomId);
        artifactId = artifact.id;
        await prisma.room.update({
          where: { id: roomId },
          data: { lastActivityAt: new Date() },
        });
      } catch (generationError) {
        artifactError = generationError instanceof Error ? generationError.message : 'Artifact generation failed';
        console.error('Artifact generation failed during completion:', generationError);
      }
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

