import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { BeatKey, BeatNumber } from '@/lib/story-runtime';
import { isStoryStateColumnMissing, normalizeStoryState, stripInternalStoryState } from '@/lib/story-runtime';

type DecisionOption = { label: string; tradeoffs?: string; risks?: string[]; outcomes?: string[] };
type DecisionPayload = { number: number; title: string; description: string; options: Record<string, DecisionOption> };
type DecisionsData = { decisions: DecisionPayload[] };

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const roomId = params.id;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        quest: {
          include: {
            decisions: {
              orderBy: { decisionNumber: 'asc' },
              include: { options: { orderBy: { optionKey: 'asc' } } },
            },
          },
        },
        members: { include: { user: true } },
        artifact: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isMember = room.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
    }

    // Build decisions from QuestDecision relations (preferred)
    let decisionsData: DecisionsData | null = null;

    if (room.quest.decisions.length > 0) {
      decisionsData = {
        decisions: room.quest.decisions.map((d) => ({
          number: d.decisionNumber,
          title: d.title,
          description: d.context || d.title,
          options: d.options.reduce<Record<string, DecisionOption>>((acc, opt) => {
            acc[opt.optionKey] = {
              label: opt.title,
              tradeoffs: opt.tradeoff || opt.description,
              risks: opt.impact ? opt.impact.split('. ').filter(Boolean) : [],
              outcomes: opt.impact ? opt.impact.split('. ').filter(Boolean) : [],
            };
            return acc;
          }, {}),
        })),
      };
    } else if (room.quest.decisionsData) {
      // Fallback: parse legacy JSON field for old quests without QuestDecision rows
      try {
        decisionsData = JSON.parse(room.quest.decisionsData) as DecisionsData;
      } catch {
        decisionsData = null;
      }
    }

    const memberIds = room.members.map((m) => m.userId);
    const storyState = normalizeStoryState(room.storyState, memberIds);
    const generatedBeatCount = Math.max(
      1,
      Math.min(5, Array.isArray(decisionsData?.decisions) ? decisionsData!.decisions.length : 5)
    ) as BeatNumber;
    storyState.totalBeats = generatedBeatCount;
    if (storyState.currentBeat > generatedBeatCount) {
      storyState.currentBeat = generatedBeatCount;
    }

    // During input phases, mask other players' submissions for blind-input integrity
    const visibleStoryState = (() => {
      const state = stripInternalStoryState(storyState);
      if (!['preamble', 'beat_input'].includes(state.phase)) return state;
      const beatKey = String(state.currentBeat) as BeatKey;
      const beat = state.beats?.[beatKey];
      if (!beat || typeof beat.submissions !== 'object') return state;
      state.beats[beatKey] = {
        ...beat,
        submissions: { [user.id]: beat.submissions[user.id] ?? '' },
      };
      return state;
    })();

    return NextResponse.json({
      room: {
        id: room.id,
        roomCode: room.roomCode,
        status: room.status,
        currentDecision: room.currentDecision,
        questName: room.quest.name,
        questDescription: room.quest.description,
        questDuration: room.quest.durationMinutes,
        memberCount: room.members.length,
        maxPlayers: room.quest.teamSize,
        minPlayersToStart: room.quest.minTeamSize ?? 2,
        decisionsData,
        members: room.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          organisation: m.user.organisation,
          role: m.user.role,
          completedAt: m.completedAt ? m.completedAt.toISOString() : null,
        })),
        storyState: visibleStoryState,
        hasArtifact: !!room.artifact,
        artifactId: room.artifact?.id,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isStoryStateColumnMissing(error)) {
      return NextResponse.json(
        { error: 'Runtime state migration is pending. Please run database migrations and retry.' },
        { status: 503 }
      );
    }
    console.error('Get room error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
