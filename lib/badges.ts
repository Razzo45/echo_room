import { prisma } from './db';
import type { BadgeType } from '@prisma/client';
import type { StoryState, BeatKey } from './story-runtime';
import { ALL_BEAT_KEYS } from './story-runtime';

// ── Badge definitions ──────────────────────────────────────────────────────

type BadgeDef = { name: string; description: string; icon: string; rarity: string };

const BADGE_DEFS: Record<BadgeType, BadgeDef> = {
  FIRST_CHAPTER: {
    name: 'First Chapter',
    description: 'Every legend starts somewhere. Complete your first story room.',
    icon: '📖',
    rarity: 'common',
  },
  NATURAL_TWENTY: {
    name: 'Natural Twenty',
    description: 'The dice gods smile upon you. Roll a natural 20.',
    icon: '🎯',
    rarity: 'rare',
  },
  FUMBLE: {
    name: 'Fumble!',
    description: 'Even heroes trip. Roll a natural 1.',
    icon: '💀',
    rarity: 'rare',
  },
  HOT_STREAK: {
    name: 'Hot Streak',
    description: 'Fortune favors the bold. Roll 15+ on every beat in a single room.',
    icon: '🔥',
    rarity: 'rare',
  },
  RISING_PHOENIX: {
    name: 'Rising Phoenix',
    description: 'Snatch victory from the jaws of defeat. Roll 3 or under, then recover with 15+ on a later beat.',
    icon: '🦅',
    rarity: 'epic',
  },
  UNITED_FRONT: {
    name: 'United Front',
    description: 'Together, unstoppable. All players roll 15+ on the same beat.',
    icon: '⚔️',
    rarity: 'epic',
  },
  SEASONED_ADVENTURER: {
    name: 'Seasoned Adventurer',
    description: 'Five tales, one storyteller. Complete 5 story rooms.',
    icon: '🗺️',
    rarity: 'common',
  },
  SOCIAL_BUTTERFLY: {
    name: 'Social Butterfly',
    description: 'A face in every tavern. Play with 10 different people.',
    icon: '🦋',
    rarity: 'epic',
  },
  ARTIFACT_COLLECTOR: {
    name: 'Artifact Collector',
    description: 'Keeper of tales. Generate 3 story artifacts.',
    icon: '📜',
    rarity: 'rare',
  },
  LEGENDARY_CAMPAIGN: {
    name: 'Legendary Campaign',
    description: 'A saga for the ages. Complete 20 story rooms.',
    icon: '👑',
    rarity: 'legendary',
  },
};

export function getBadgeDefinition(badgeType: BadgeType): BadgeDef {
  return BADGE_DEFS[badgeType];
}

/** Journey order: easy → hard for UI display and progress tracking */
export const BADGE_JOURNEY_ORDER: BadgeType[] = [
  'FIRST_CHAPTER',
  'NATURAL_TWENTY',
  'FUMBLE',
  'HOT_STREAK',
  'RISING_PHOENIX',
  'UNITED_FRONT',
  'SEASONED_ADVENTURER',
  'SOCIAL_BUTTERFLY',
  'ARTIFACT_COLLECTOR',
  'LEGENDARY_CAMPAIGN',
];

// ── Core award helper ──────────────────────────────────────────────────────

export async function awardBadge(
  userId: string,
  badgeType: BadgeType,
  context?: { roomId?: string; metadata?: Record<string, any> }
): Promise<boolean> {
  try {
    let badge = await prisma.badge.findUnique({ where: { badgeType } });
    if (!badge) {
      const def = getBadgeDefinition(badgeType);
      badge = await prisma.badge.create({
        data: { badgeType, name: def.name, description: def.description, icon: def.icon, rarity: def.rarity },
      });
    }

    const existing = await prisma.userBadge.findFirst({
      where: {
        userId,
        badgeId: badge.id,
        ...(context?.roomId ? { roomId: context.roomId } : {}),
      },
    });
    if (existing) return false;

    await prisma.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
        roomId: context?.roomId ?? null,
        metadata: context?.metadata ? JSON.stringify(context.metadata) : null,
      },
    });
    return true;
  } catch (error) {
    console.error('Error awarding badge:', error);
    return false;
  }
}

// ── Room-completion badge check ────────────────────────────────────────────

/**
 * Evaluate all d20-gameplay badges after a room reaches COMPLETED.
 * Called from complete/route.ts once all members have tapped "Finish".
 */
export async function checkRoomCompletionBadges(roomId: string): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: { include: { user: true } },
      artifact: true,
    },
  });
  if (!room || room.status !== 'COMPLETED') return;

  const playerIds = room.members.map((m) => m.userId);
  const state = room.storyState as StoryState | null;
  if (!state) return;

  const totalBeats = state.totalBeats ?? 5;
  const beatKeys = ALL_BEAT_KEYS.filter((k) => Number(k) <= totalBeats);

  // Batch per-player DB queries in parallel, then evaluate badge criteria
  const memberStats = await Promise.all(
    room.members.map(async (member) => {
      const uid = member.userId;
      const [completedCount, artifactCount, teammates] = await Promise.all([
        prisma.roomMember.count({ where: { userId: uid, room: { status: 'COMPLETED' } } }),
        prisma.artifact.count({ where: { room: { members: { some: { userId: uid } }, status: 'COMPLETED' } } }),
        prisma.roomMember.findMany({
          where: { room: { status: { in: ['COMPLETED', 'IN_PROGRESS'] }, members: { some: { userId: uid } } } },
          select: { userId: true },
        }),
      ]);
      return { uid, completedCount, artifactCount, teammates };
    })
  );

  for (const { uid, completedCount, artifactCount, teammates } of memberStats) {
    if (completedCount === 1) {
      await awardBadge(uid, 'FIRST_CHAPTER', { roomId });
    }

    for (const bk of beatKeys) {
      const roll = state.beats[bk]?.rolls?.[uid];
      if (!roll) continue;
      if (roll.value === 20) {
        await awardBadge(uid, 'NATURAL_TWENTY', { roomId, metadata: { beat: Number(bk), value: 20 } });
      }
      if (roll.value === 1) {
        await awardBadge(uid, 'FUMBLE', { roomId, metadata: { beat: Number(bk), value: 1 } });
      }
    }

    const playerRolls = beatKeys.map((bk) => state.beats[bk]?.rolls?.[uid]?.value ?? 0);
    const allPlayed = playerRolls.every((v) => v > 0);
    if (allPlayed && playerRolls.every((v) => v >= 15)) {
      await awardBadge(uid, 'HOT_STREAK', { roomId, metadata: { rolls: playerRolls } });
    }

    const rollsByBeat = beatKeys.map((bk) => state.beats[bk]?.rolls?.[uid]?.value ?? 0);
    const lowestBeatIdx = rollsByBeat.findIndex((v) => v >= 1 && v <= 3);
    if (lowestBeatIdx >= 0 && rollsByBeat.slice(lowestBeatIdx + 1).some((v) => v >= 15)) {
      await awardBadge(uid, 'RISING_PHOENIX', { roomId, metadata: { recovered: true } });
    }

    if (completedCount >= 5) {
      await awardBadge(uid, 'SEASONED_ADVENTURER', { metadata: { count: completedCount } });
    }
    if (completedCount >= 20) {
      await awardBadge(uid, 'LEGENDARY_CAMPAIGN', { metadata: { count: completedCount } });
    }
    if (artifactCount >= 3) {
      await awardBadge(uid, 'ARTIFACT_COLLECTOR', { metadata: { count: artifactCount } });
    }

    const uniqueMates = new Set(teammates.map((t) => t.userId).filter((id) => id !== uid));
    if (uniqueMates.size >= 10) {
      await awardBadge(uid, 'SOCIAL_BUTTERFLY', { metadata: { count: uniqueMates.size } });
    }
  }

  // ─ UNITED_FRONT: all players rolled 15+ on the same beat (awarded to everyone in the room) ─
  for (const bk of beatKeys) {
    const beat = state.beats[bk];
    if (!beat?.rolls) continue;
    const allHigh = playerIds.every((pid) => (beat.rolls[pid]?.value ?? 0) >= 15);
    if (allHigh && playerIds.length >= 2) {
      for (const uid of playerIds) {
        await awardBadge(uid, 'UNITED_FRONT', { roomId, metadata: { beat: Number(bk) } });
      }
      break; // one beat is enough
    }
  }
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function getUserBadges(userId: string) {
  return prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  });
}

export async function getBadgeStats(userId: string) {
  const badges = await getUserBadges(userId);
  const byRarity = badges.reduce(
    (acc, ub) => {
      const r = ub.badge.rarity;
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  return { total: badges.length, byRarity, recent: badges.slice(0, 5) };
}

// ── Progress hints ─────────────────────────────────────────────────────────

export type ProgressHint = {
  badgeType: BadgeType;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  hint: string;
  current: number;
  target: number;
  percent: number;
};

export async function getProgressTowardBadges(userId: string): Promise<ProgressHint[]> {
  const earned = await getUserBadges(userId);
  const earnedTypes = new Set(earned.map((ub) => ub.badge.badgeType));
  const hints: ProgressHint[] = [];

  const completedCount = await prisma.roomMember.count({
    where: { userId, room: { status: 'COMPLETED' } },
  });

  for (const bt of BADGE_JOURNEY_ORDER) {
    const def = getBadgeDefinition(bt);
    const base = { badgeType: bt, name: def.name, description: def.description, icon: def.icon, rarity: def.rarity };

    if (earnedTypes.has(bt)) {
      hints.push({ ...base, hint: 'Earned!', current: 1, target: 1, percent: 100 });
      continue;
    }

    switch (bt) {
      case 'FIRST_CHAPTER':
        hints.push({ ...base, hint: 'Complete your first story room.', current: completedCount, target: 1, percent: completedCount >= 1 ? 100 : 0 });
        break;

      case 'NATURAL_TWENTY':
        hints.push({ ...base, hint: 'Roll a 20 on the d20. 5% chance per roll — keep playing!', current: 0, target: 1, percent: 0 });
        break;

      case 'FUMBLE':
        hints.push({ ...base, hint: 'Roll a 1 on the d20. It happens to the best of us.', current: 0, target: 1, percent: 0 });
        break;

      case 'HOT_STREAK':
        hints.push({ ...base, hint: 'Roll 15+ on every beat in a single room.', current: 0, target: 1, percent: 0 });
        break;

      case 'RISING_PHOENIX':
        hints.push({ ...base, hint: 'Roll 3 or under on a beat, then bounce back with 15+ on a later beat.', current: 0, target: 1, percent: 0 });
        break;

      case 'UNITED_FRONT':
        hints.push({ ...base, hint: 'The whole team rolls 15+ on the same beat. Rare, but glorious.', current: 0, target: 1, percent: 0 });
        break;

      case 'SEASONED_ADVENTURER': {
        const pct = Math.min(100, Math.round((completedCount / 5) * 100));
        hints.push({ ...base, hint: `${completedCount}/5 rooms completed.`, current: completedCount, target: 5, percent: pct });
        break;
      }

      case 'SOCIAL_BUTTERFLY': {
        const mates = await prisma.roomMember.findMany({
          where: { room: { status: { in: ['COMPLETED', 'IN_PROGRESS'] }, members: { some: { userId } } } },
          select: { userId: true },
        });
        const unique = new Set(mates.map((m) => m.userId).filter((id) => id !== userId));
        const pct = Math.min(100, Math.round((unique.size / 10) * 100));
        hints.push({ ...base, hint: `${unique.size}/10 unique teammates.`, current: unique.size, target: 10, percent: pct });
        break;
      }

      case 'ARTIFACT_COLLECTOR': {
        const count = await prisma.artifact.count({
          where: { room: { members: { some: { userId } }, status: 'COMPLETED' } },
        });
        const pct = Math.min(100, Math.round((count / 3) * 100));
        hints.push({ ...base, hint: `${count}/3 story artifacts generated.`, current: count, target: 3, percent: pct });
        break;
      }

      case 'LEGENDARY_CAMPAIGN': {
        const pct = Math.min(100, Math.round((completedCount / 20) * 100));
        hints.push({ ...base, hint: `${completedCount}/20 rooms completed.`, current: completedCount, target: 20, percent: pct });
        break;
      }
    }
  }

  return hints;
}
