import { prisma } from './db';
import type { BadgeType } from '@prisma/client';

/**
 * Badge Service - Handles badge awarding logic for gamification
 * Awards badges based on user actions and collaborative achievements
 */

export interface BadgeAwardContext {
  userId: string;
  roomId?: string;
  metadata?: Record<string, any>;
}

/**
 * Award a badge to a user if they don't already have it
 */
export async function awardBadge(
  userId: string,
  badgeType: BadgeType,
  context?: { roomId?: string; metadata?: Record<string, any> }
): Promise<boolean> {
  try {
    // Find or create the badge definition
    let badge = await prisma.badge.findUnique({
      where: { badgeType },
    });

    if (!badge) {
      // Create badge definition if it doesn't exist
      const badgeDef = getBadgeDefinition(badgeType);
      badge = await prisma.badge.create({
        data: {
          badgeType,
          name: badgeDef.name,
          description: badgeDef.description,
          icon: badgeDef.icon,
          rarity: badgeDef.rarity,
        },
      });
    }

    // Check if user already has this badge (for this room if roomId provided)
    const existing = await prisma.userBadge.findFirst({
      where: {
        userId,
        badgeId: badge.id,
        ...(context?.roomId && { roomId: context.roomId }),
      },
    });

    if (existing) {
      return false; // Already awarded
    }

    // Award the badge
    await prisma.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
        roomId: context?.roomId || null,
        metadata: context?.metadata ? JSON.stringify(context.metadata) : null,
      },
    });

    return true;
  } catch (error) {
    console.error('Error awarding badge:', error);
    return false;
  }
}

/**
 * Check and award badges when a room is completed
 */
export async function checkRoomCompletionBadges(roomId: string): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: { user: true },
      },
      votes: true,
      commits: true,
      quest: true,
    },
  });

  if (!room || room.status !== 'COMPLETED') {
    return;
  }

  const memberIds = room.members.map((m) => m.userId);
  const decisionCount = room.commits.length;

  // Award badges to each member
  for (const member of room.members) {
    const userId = member.userId;
    const userVotes = room.votes.filter((v) => v.userId === userId);
    const userVoteCount = userVotes.length;

    // FIRST_QUEST_COMPLETE - First completed quest
    const completedRooms = await prisma.roomMember.count({
      where: {
        userId,
        room: {
          status: 'COMPLETED',
        },
      },
    });
    if (completedRooms === 1) {
      await awardBadge(userId, 'FIRST_QUEST_COMPLETE', { roomId });
    }

    // TEAM_PLAYER - Completed a team decision room
    if (room.quest.questType === 'DECISION_ROOM' && room.members.length >= 3) {
      await awardBadge(userId, 'TEAM_PLAYER', { roomId });
    }

    // COLLABORATOR - Voted in all decisions
    if (userVoteCount === decisionCount && decisionCount > 0) {
      await awardBadge(userId, 'COLLABORATOR', {
        roomId,
        metadata: { decisionsParticipated: decisionCount },
      });
    }

    // STORYTELLER - Provided detailed justifications (all votes have substantial text)
    const hasDetailedJustifications = userVotes.every(
      (v) => v.justification && v.justification.length >= 50
    );
    if (hasDetailedJustifications && userVoteCount >= 3) {
      await awardBadge(userId, 'STORYTELLER', {
        roomId,
        metadata: { justificationCount: userVoteCount },
      });
    }

    // DECISION_MAKER - Committed to final decision
    const finalCommit = room.commits.find((c) => c.decisionNumber === decisionCount);
    if (finalCommit) {
      await awardBadge(userId, 'DECISION_MAKER', {
        roomId,
        metadata: { finalDecision: finalCommit.committedOption },
      });
    }

    // ARTIFACT_CREATOR - Room has artifact
    const artifact = await prisma.artifact.findUnique({
      where: { roomId },
    });
    if (artifact) {
      await awardBadge(userId, 'ARTIFACT_CREATOR', { roomId });
    }

    // PERFECT_TEAM - All 3 members voted and committed
    if (room.members.length === 3) {
      const allVoted = room.members.every((m) =>
        room.votes.some((v) => v.userId === m.userId)
      );
      const allCommitted = room.commits.length === decisionCount;
      if (allVoted && allCommitted) {
        await awardBadge(userId, 'PERFECT_TEAM', {
          roomId,
          metadata: { teamSize: 3 },
        });
      }
    }

    // CONSENSUS_BUILDER - Team reached unanimous votes on at least one decision
    for (let i = 1; i <= decisionCount; i++) {
      const decisionVotes = room.votes.filter((v) => v.decisionNumber === i);
      if (decisionVotes.length >= 3) {
        const uniqueOptions = new Set(decisionVotes.map((v) => v.optionKey));
        if (uniqueOptions.size === 1) {
          await awardBadge(userId, 'CONSENSUS_BUILDER', {
            roomId,
            metadata: { unanimousDecision: i },
          });
          break;
        }
      }
    }

    // DIVERSITY_CHAMPION - Teamed with people from different countries
    const countries = new Set(room.members.map((m) => m.user.country));
    if (countries.size >= 3) {
      await awardBadge(userId, 'DIVERSITY_CHAMPION', {
        roomId,
        metadata: { uniqueCountries: Array.from(countries) },
      });
    }
  }

  // Check global badges (not room-specific)
  for (const member of room.members) {
    await checkGlobalBadges(member.userId);
  }
}

/**
 * Check and award global badges (not tied to specific rooms)
 */
export async function checkGlobalBadges(userId: string): Promise<void> {
  // QUEST_MASTER - Completed 5+ quests
  const completedQuests = await prisma.roomMember.count({
    where: {
      userId,
      room: {
        status: 'COMPLETED',
      },
    },
  });
  if (completedQuests >= 5) {
    await awardBadge(userId, 'QUEST_MASTER', {
      metadata: { questsCompleted: completedQuests },
    });
  }

  // SOCIAL_CONNECTOR - Teamed with 10+ different people
  const uniqueTeammates = await prisma.roomMember.findMany({
    where: {
      room: {
        members: {
          some: { userId },
        },
        status: { in: ['COMPLETED', 'IN_PROGRESS'] },
      },
    },
    include: {
      room: {
        include: {
          members: true,
        },
      },
    },
  });

  const teammateIds = new Set<string>();
  uniqueTeammates.forEach((membership) => {
    membership.room.members.forEach((m) => {
      if (m.userId !== userId) {
        teammateIds.add(m.userId);
      }
    });
  });

  if (teammateIds.size >= 10) {
    await awardBadge(userId, 'SOCIAL_CONNECTOR', {
      metadata: { uniqueTeammates: teammateIds.size },
    });
  }
}

/**
 * Get badge definitions
 */
export function getBadgeDefinition(badgeType: BadgeType) {
  const definitions: Record<
    BadgeType,
    { name: string; description: string; icon: string; rarity: string }
  > = {
    FIRST_QUEST_COMPLETE: {
      name: 'First Steps',
      description: 'Completed your first quest',
      icon: '🎯',
      rarity: 'common',
    },
    TEAM_PLAYER: {
      name: 'Team Player',
      description: 'Completed a collaborative decision room',
      icon: '🤝',
      rarity: 'common',
    },
    COLLABORATOR: {
      name: 'Collaborator',
      description: 'Voted in all decisions of a room',
      icon: '💬',
      rarity: 'common',
    },
    STORYTELLER: {
      name: 'Storyteller',
      description: 'Provided detailed justifications in 3+ decisions',
      icon: '📖',
      rarity: 'rare',
    },
    DECISION_MAKER: {
      name: 'Decision Maker',
      description: 'Committed to the final decision in a room',
      icon: '⚡',
      rarity: 'common',
    },
    ARTIFACT_CREATOR: {
      name: 'Artifact Creator',
      description: 'Generated a decision map artifact',
      icon: '🗺️',
      rarity: 'common',
    },
    QUEST_MASTER: {
      name: 'Quest Master',
      description: 'Completed 5+ quests',
      icon: '🏆',
      rarity: 'epic',
    },
    SOCIAL_CONNECTOR: {
      name: 'Social Connector',
      description: 'Teamed with 10+ different people',
      icon: '🌐',
      rarity: 'rare',
    },
    PERFECT_TEAM: {
      name: 'Perfect Team',
      description: 'All team members voted and committed',
      icon: '✨',
      rarity: 'rare',
    },
    EARLY_BIRD: {
      name: 'Early Bird',
      description: 'Joined within first hour of event',
      icon: '🌅',
      rarity: 'common',
    },
    NIGHT_OWL: {
      name: 'Night Owl',
      description: 'Active during late hours',
      icon: '🦉',
      rarity: 'common',
    },
    CONSENSUS_BUILDER: {
      name: 'Consensus Builder',
      description: 'Team reached unanimous votes',
      icon: '🎯',
      rarity: 'rare',
    },
    DIVERSITY_CHAMPION: {
      name: 'Diversity Champion',
      description: 'Teamed with people from 3+ different countries',
      icon: '🌍',
      rarity: 'epic',
    },
  };

  return definitions[badgeType];
}

/**
 * Get user's badges with details
 */
export async function getUserBadges(userId: string) {
  return await prisma.userBadge.findMany({
    where: { userId },
    include: {
      badge: true,
    },
    orderBy: {
      earnedAt: 'desc',
    },
  });
}

/**
 * Get badge statistics for a user
 */
export async function getBadgeStats(userId: string) {
  const badges = await getUserBadges(userId);
  const byRarity = badges.reduce(
    (acc, ub) => {
      const rarity = ub.badge.rarity;
      acc[rarity] = (acc[rarity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    total: badges.length,
    byRarity,
    recent: badges.slice(0, 5),
  };
}
