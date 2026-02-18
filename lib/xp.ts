/**
 * Light XP system: computed from votes and completions, not stored.
 * XP is not shown publicly; only level and label are displayed.
 */
import { prisma } from './db';

const LEVELS: { minXp: number; label: string }[] = [
  { minXp: 0, label: 'Explorer' },
  { minXp: 6, label: 'City Contributor' },
  { minXp: 16, label: 'Decision Architect' },
];

export function xpToLevel(xp: number): { level: number; label: string } {
  let level = 1;
  let label = LEVELS[0].label;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      level = i + 1;
      label = LEVELS[i].label;
      break;
    }
  }
  return { level, label };
}

export function computeXp(params: {
  voteCount: number;
  completedRoomCount: number;
  unanimousRoomCount: number;
}): number {
  return (
    params.voteCount * 1 +
    params.completedRoomCount * 5 +
    params.unanimousRoomCount * 3
  );
}

export async function getLevelForUser(userId: string): Promise<{ level: number; label: string }> {
  const [voteCount, completedRoomIds] = await Promise.all([
    prisma.vote.count({ where: { userId } }),
    prisma.roomMember.findMany({
      where: { userId, room: { status: 'COMPLETED' } },
      select: { roomId: true },
    }).then((rows) => [...new Set(rows.map((r) => r.roomId))]),
  ]);

  let unanimousRoomCount = 0;
  if (completedRoomIds.length > 0) {
    const votes = await prisma.vote.findMany({
      where: { roomId: { in: completedRoomIds } },
      select: { roomId: true, decisionNumber: true, optionKey: true },
    });
    const byRoom = new Map<string, Map<number, Set<string>>>();
    for (const v of votes) {
      if (!byRoom.has(v.roomId)) byRoom.set(v.roomId, new Map());
      const perDec = byRoom.get(v.roomId)!;
      if (!perDec.has(v.decisionNumber)) perDec.set(v.decisionNumber, new Set());
      perDec.get(v.decisionNumber)!.add(v.optionKey);
    }
    for (const roomId of completedRoomIds) {
      const perDec = byRoom.get(roomId);
      if (!perDec) continue;
      if ([...perDec.values()].every((s) => s.size === 1)) unanimousRoomCount++;
    }
  }

  const xp = computeXp({
    voteCount,
    completedRoomCount: completedRoomIds.length,
    unanimousRoomCount,
  });
  return xpToLevel(xp);
}
