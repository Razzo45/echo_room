import type { Prisma } from '@prisma/client';

type RoomPhase =
  | 'waiting'
  | 'room_full'
  | 'ready_check'
  | 'preamble'
  | 'beat_input'
  | 'roll_reveal'
  | 'beat_consequence'
  | 'final_panel'
  | 'completed';

type RollBand = 'critical_fail' | 'fail' | 'mixed' | 'success' | 'critical_success';

export type BeatNumber = 1 | 2 | 3 | 4 | 5;
export type BeatKey = '1' | '2' | '3' | '4' | '5';
export const ALL_BEAT_KEYS: readonly BeatKey[] = ['1', '2', '3', '4', '5'] as const;

type BeatState = {
  submissions: Record<string, string>;
  revealed: boolean;
  rolls: Record<string, { value: number; band: RollBand; rolledAt: string }>;
  consequence: { text: string; mode: string; generatedAt: string } | null;
  resolved: boolean;
};

type StoryState = {
  phase: RoomPhase;
  currentBeat: BeatNumber;
  totalBeats: BeatNumber;
  readyCheck: {
    startedAt: string | null;
    deadlineAt: string | null;
    readyByPlayerId: Record<string, boolean>;
  };
  beats: Record<BeatKey, BeatState>;
  finalSynthesis: {
    status: 'idle' | 'pending' | 'done';
    text: string;
    mode: string;
  };
  rollContinue: {
    beat: BeatNumber;
    byPlayerId: Record<string, boolean>;
  } | null;
  consequenceContinue: {
    beat: BeatNumber;
    byPlayerId: Record<string, boolean>;
  } | null;
  internal?: {
    decisionCommitBeat?: BeatNumber;
    decisionCommitAt?: string;
  };
};

function emptyBeat(): BeatState {
  return {
    submissions: {},
    revealed: false,
    rolls: {},
    consequence: null,
    resolved: false,
  };
}

export function createInitialStoryState(playerIds: string[], totalBeats: BeatNumber = 5): StoryState {
  const uniquePlayerIds = [...new Set(playerIds)];
  const readyByPlayerId: Record<string, boolean> = {};

  for (const playerId of uniquePlayerIds) {
    readyByPlayerId[playerId] = false;
  }

  return {
    phase: 'waiting',
    currentBeat: 1,
    totalBeats,
    readyCheck: {
      startedAt: null,
      deadlineAt: null,
      readyByPlayerId,
    },
    beats: {
      '1': emptyBeat(),
      '2': emptyBeat(),
      '3': emptyBeat(),
      '4': emptyBeat(),
      '5': emptyBeat(),
    },
    finalSynthesis: {
      status: 'idle',
      text: '',
      mode: '',
    },
    rollContinue: null,
    consequenceContinue: null,
  };
}

export function normalizeStoryState(raw: unknown, playerIds: string[]): StoryState {
  const fallback = createInitialStoryState(playerIds);
  if (!raw || typeof raw !== 'object') return fallback;

  const parsed = raw as Partial<StoryState>;
  const state: StoryState = {
    ...fallback,
    ...parsed,
    readyCheck: {
      ...fallback.readyCheck,
      ...(parsed.readyCheck ?? {}),
      readyByPlayerId: {
        ...fallback.readyCheck.readyByPlayerId,
        ...((parsed.readyCheck?.readyByPlayerId as Record<string, boolean> | undefined) ?? {}),
      },
    },
    beats: {
      '1': { ...fallback.beats['1'], ...(parsed.beats?.['1'] ?? {}) },
      '2': { ...fallback.beats['2'], ...(parsed.beats?.['2'] ?? {}) },
      '3': { ...fallback.beats['3'], ...(parsed.beats?.['3'] ?? {}) },
      '4': { ...fallback.beats['4'], ...(parsed.beats?.['4'] ?? {}) },
      '5': { ...fallback.beats['5'], ...(parsed.beats?.['5'] ?? {}) },
    },
    finalSynthesis: {
      ...fallback.finalSynthesis,
      ...(parsed.finalSynthesis ?? {}),
    },
    rollContinue:
      parsed.rollContinue === undefined
        ? fallback.rollContinue
        : parsed.rollContinue,
    consequenceContinue:
      parsed.consequenceContinue === undefined
        ? fallback.consequenceContinue
        : parsed.consequenceContinue,
    internal: parsed.internal ?? fallback.internal,
  };

  const parsedTotal = Number(state.totalBeats ?? 5);
  state.totalBeats = Math.max(1, Math.min(5, parsedTotal)) as BeatNumber;
  if (state.currentBeat > state.totalBeats) {
    state.currentBeat = state.totalBeats;
  }

  for (const playerId of playerIds) {
    if (!(playerId in state.readyCheck.readyByPlayerId)) {
      state.readyCheck.readyByPlayerId[playerId] = false;
    }
  }

  const cb = state.currentBeat;
  const cbKey = String(cb) as BeatKey;
  if (
    state.phase === 'beat_consequence' &&
    state.beats[cbKey]?.consequence &&
    (!state.consequenceContinue || state.consequenceContinue.beat !== cb)
  ) {
    state.consequenceContinue = {
      beat: cb,
      byPlayerId: Object.fromEntries(playerIds.map((id) => [id, false])),
    };
  }

  return state;
}

export function stripInternalStoryState(state: StoryState): Omit<StoryState, 'internal'> {
  const safeState = { ...state };
  delete safeState.internal;
  return safeState;
}

/**
 * Acquire a row-level lock for a room inside an active transaction.
 * This prevents concurrent read-modify-write clobbering of storyState.
 */
export async function lockRoomForUpdate(
  tx: Prisma.TransactionClient,
  roomId: string
): Promise<void> {
  await tx.$executeRaw`SELECT 1 FROM "Room" WHERE id = ${roomId} FOR UPDATE`;
}

export function isStoryStateColumnMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  const message = (e.message || '').toLowerCase();
  return (
    e.code === 'P2022' ||
    message.includes('storystate') ||
    (message.includes('column') && message.includes('does not exist'))
  );
}

export type { StoryState, RoomPhase, RollBand };
