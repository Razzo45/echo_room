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

type BeatState = {
  submissions: Record<string, string>;
  revealed: boolean;
  rolls: Record<string, { value: number; band: RollBand; rolledAt: string }>;
  consequence: { text: string; mode: string; generatedAt: string } | null;
  resolved: boolean;
};

type StoryState = {
  phase: RoomPhase;
  currentBeat: 1 | 2 | 3;
  readyCheck: {
    startedAt: string | null;
    deadlineAt: string | null;
    readyByPlayerId: Record<string, boolean>;
  };
  beats: Record<'1' | '2' | '3', BeatState>;
  scoreboard: {
    playerTotals: Record<string, number>;
    teamAverage: number;
    teamBand: string;
  };
  finalSynthesis: {
    status: 'idle' | 'pending' | 'done';
    text: string;
    mode: string;
  };
  internal?: {
    decisionCommitBeat?: 1 | 2 | 3;
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

function inferTeamBand(teamAverage: number): string {
  if (teamAverage >= 48) return 'critical_success';
  if (teamAverage >= 36) return 'success';
  if (teamAverage >= 24) return 'mixed';
  if (teamAverage >= 12) return 'fail';
  return 'critical_fail';
}

export function createInitialStoryState(playerIds: string[]): StoryState {
  const uniquePlayerIds = [...new Set(playerIds)];
  const readyByPlayerId: Record<string, boolean> = {};
  const playerTotals: Record<string, number> = {};

  for (const playerId of uniquePlayerIds) {
    readyByPlayerId[playerId] = false;
    playerTotals[playerId] = 0;
  }

  return {
    phase: 'waiting',
    currentBeat: 1,
    readyCheck: {
      startedAt: null,
      deadlineAt: null,
      readyByPlayerId,
    },
    beats: {
      '1': emptyBeat(),
      '2': emptyBeat(),
      '3': emptyBeat(),
    },
    scoreboard: {
      playerTotals,
      teamAverage: 0,
      teamBand: inferTeamBand(0),
    },
    finalSynthesis: {
      status: 'idle',
      text: '',
      mode: '',
    },
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
    },
    scoreboard: {
      ...fallback.scoreboard,
      ...(parsed.scoreboard ?? {}),
      playerTotals: {
        ...fallback.scoreboard.playerTotals,
        ...((parsed.scoreboard?.playerTotals as Record<string, number> | undefined) ?? {}),
      },
    },
    finalSynthesis: {
      ...fallback.finalSynthesis,
      ...(parsed.finalSynthesis ?? {}),
    },
    internal: parsed.internal ?? fallback.internal,
  };

  for (const playerId of playerIds) {
    if (!(playerId in state.readyCheck.readyByPlayerId)) {
      state.readyCheck.readyByPlayerId[playerId] = false;
    }
    if (!(playerId in state.scoreboard.playerTotals)) {
      state.scoreboard.playerTotals[playerId] = 0;
    }
  }

  return state;
}

export function computeScoreboard(state: StoryState, playerIds: string[]): void {
  for (const playerId of playerIds) {
    let total = 0;
    for (const beatKey of ['1', '2', '3'] as const) {
      total += state.beats[beatKey].rolls[playerId]?.value ?? 0;
    }
    state.scoreboard.playerTotals[playerId] = Math.max(0, Math.min(60, total));
  }

  const players = playerIds.filter((id) => id in state.scoreboard.playerTotals);
  const sum = players.reduce((acc, id) => acc + state.scoreboard.playerTotals[id], 0);
  const average = players.length > 0 ? sum / players.length : 0;
  state.scoreboard.teamAverage = Number(average.toFixed(2));
  state.scoreboard.teamBand = inferTeamBand(state.scoreboard.teamAverage);
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

export type { StoryState, RoomPhase, RollBand };
