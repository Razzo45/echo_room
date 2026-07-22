/**
 * Forum → playspace seeding: spawn NEW quest + OPEN room from a published post.
 * Never mutates in-progress / existing open rooms' content.
 */
import { prisma } from './db';
import crypto from 'crypto';
import type { EventForumPost } from '@prisma/client';

const FEED_REGION_NAME = 'from-the-feed';

export async function seedPlayspaceFromForumPost(post: EventForumPost) {
  if (!post.seedPlayspace || post.seededQuestId) {
    return { questId: post.seededQuestId ?? null, roomId: null as string | null };
  }

  let region = await prisma.region.findFirst({
    where: { eventId: post.eventId, name: FEED_REGION_NAME },
  });

  if (!region) {
    const maxSort = await prisma.region.aggregate({
      where: { eventId: post.eventId },
      _max: { sortOrder: true },
    });
    region = await prisma.region.create({
      data: {
        eventId: post.eventId,
        name: FEED_REGION_NAME,
        displayName: 'From the feed',
        description: 'Missions seeded from organiser updates — existing rooms keep their original content.',
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        isActive: true,
      },
    });
  }

  const questCount = await prisma.quest.count({ where: { regionId: region.id } });
  const quest = await prisma.quest.create({
    data: {
      regionId: region.id,
      name: post.title.slice(0, 120),
      description: `${post.body.slice(0, 500)}\n\n(~15 min · from organiser ${post.type.toLowerCase()})`,
      questType: 'DECISION_ROOM',
      durationMinutes: 15,
      teamSize: 3,
      minTeamSize: 2,
      sortOrder: questCount,
      isActive: true,
      decisions: {
        create: [
          {
            decisionNumber: 1,
            title: 'Opening beat',
            context: post.body.slice(0, 400),
            sortOrder: 0,
            options: {
              create: [
                { optionKey: 'A', title: 'Cautious path', description: 'Steady and low risk', tradeoff: 'Slower progress' },
                { optionKey: 'B', title: 'Balanced path', description: 'Meet in the middle', tradeoff: 'Some compromise' },
                { optionKey: 'C', title: 'Bold path', description: 'Push the stakes', tradeoff: 'Higher exposure' },
              ],
            },
          },
          {
            decisionNumber: 2,
            title: 'Turning point',
            context: `Continue the thread from: ${post.title}`,
            sortOrder: 1,
            options: {
              create: [
                { optionKey: 'A', title: 'Listen first', description: 'Gather more signal', tradeoff: 'Delay' },
                { optionKey: 'B', title: 'Commit now', description: 'Lock a direction', tradeoff: 'Less flexibility' },
                { optionKey: 'C', title: 'Split focus', description: 'Cover two fronts', tradeoff: 'Diluted effort' },
              ],
            },
          },
          {
            decisionNumber: 3,
            title: 'Closing beat',
            context: 'What do you leave ready for day-of?',
            sortOrder: 2,
            options: {
              create: [
                { optionKey: 'A', title: 'A clear ask', description: 'One concrete next step', tradeoff: 'Narrow' },
                { optionKey: 'B', title: 'A shared map', description: 'Capture the journey', tradeoff: 'Needs follow-up' },
                { optionKey: 'C', title: 'An open door', description: 'Invite more people in', tradeoff: 'Less control' },
              ],
            },
          },
        ],
      },
    },
  });

  const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  const room = await prisma.room.create({
    data: {
      eventId: post.eventId,
      questId: quest.id,
      roomCode,
      status: 'OPEN',
      isPrivate: false,
      contentVersionId: post.id,
      lastActivityAt: new Date(),
    },
  });

  await prisma.eventForumPost.update({
    where: { id: post.id },
    data: { seededQuestId: quest.id },
  });

  return { questId: quest.id, roomId: room.id };
}
