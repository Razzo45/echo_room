/**
 * Create a private 2-player story room for an accepted play invite.
 */
import { prisma } from './db';
import crypto from 'crypto';
import { createInitialStoryState } from './story-runtime';

export async function createPrivatePlayRoom(params: {
  eventId: string;
  questId: string;
  playerIds: [string, string];
}) {
  const { eventId, questId, playerIds } = params;

  const quest = await prisma.quest.findFirst({
    where: { id: questId, region: { eventId } },
    include: { _count: { select: { decisions: true } } },
  });
  if (!quest) throw new Error('Quest not found');

  const beatCount = Math.min(5, Math.max(3, quest._count.decisions || 5));
  const roomCode = `P${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const storyState = createInitialStoryState(
    playerIds,
    (beatCount === 3 || beatCount === 4 || beatCount === 5 ? beatCount : 5) as 3 | 4 | 5
  );

  const room = await prisma.room.create({
    data: {
      eventId,
      questId,
      roomCode,
      status: 'OPEN',
      isPrivate: true,
      storyState: storyState as object,
      lastActivityAt: new Date(),
      members: {
        create: playerIds.map((userId) => ({ userId })),
      },
    },
  });

  return room;
}

/** Pick a default quest for private play: first active quest in the event. */
export async function pickDefaultQuestId(eventId: string): Promise<string | null> {
  const quest = await prisma.quest.findFirst({
    where: { isActive: true, region: { eventId, isActive: true } },
    orderBy: [{ sortOrder: 'asc' }],
    select: { id: true },
  });
  return quest?.id ?? null;
}
