/**
 * Data deprecation: 2 weeks after event endDate, cleanup participant/activity data.
 * Event structure (Event, Region, Quest, EventCode) is kept; Sessions, Room, Vote,
 * DecisionCommit, Artifact, User, UserBadge, AnalyticsEvent are hard-deleted.
 */

import { prisma } from './db';

const RETENTION_WEEKS = 2;

export type CleanupResult = {
  eventId: string;
  eventName: string;
  deletedSessions: number;
  deletedVotes: number;
  deletedDecisionCommits: number;
  deletedArtifacts: number;
  deletedUserBadges: number;
  deletedRoomMembers: number;
  deletedRooms: number;
  deletedUsers: number;
  deletedAnalyticsEvents: number;
  logId: string;
};

/** Events eligible for cleanup: endDate + 2 weeks < now and retentionOverride = false */
export async function getEligibleEventIds(): Promise<{ id: string; name: string; endDate: Date }[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_WEEKS * 7);

  const events = await prisma.event.findMany({
    where: {
      endDate: { not: null, lt: cutoff },
      retentionOverride: false,
    },
    select: { id: true, name: true, endDate: true },
  });

  return events.filter((e): e is typeof e & { endDate: Date } => e.endDate != null) as { id: string; name: string; endDate: Date }[];
}

/** Run cleanup for one event. Returns counts and creates audit log. */
export async function runCleanupForEvent(
  eventId: string,
  triggeredBy: string | null = null
): Promise<CleanupResult | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      endDate: true,
      retentionOverride: true,
      eventCodes: { select: { id: true } },
      rooms: { select: { id: true } },
      users: { select: { id: true } },
    },
  });

  if (!event) return null;
  if (event.retentionOverride) return null;
  if (!event.endDate) return null;
  const deadline = new Date(event.endDate);
  deadline.setDate(deadline.getDate() + RETENTION_WEEKS * 7);
  if (deadline > new Date()) return null;

  const eventCodeIds = event.eventCodes.map((c) => c.id);
  const roomIds = event.rooms.map((r) => r.id);
  const userIds = event.users.map((u) => u.id);

  const deletedSessions = await prisma.session.deleteMany({
    where: { eventCodeId: { in: eventCodeIds } },
  });
  const deletedVotes = await prisma.vote.deleteMany({
    where: { roomId: { in: roomIds } },
  });
  const deletedDecisionCommits = await prisma.decisionCommit.deleteMany({
    where: { roomId: { in: roomIds } },
  });
  const deletedArtifacts = await prisma.artifact.deleteMany({
    where: { roomId: { in: roomIds } },
  });
  const deletedUserBadges = await prisma.userBadge.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { roomId: { in: roomIds } },
      ],
    },
  });
  const deletedRoomMembers = await prisma.roomMember.deleteMany({
    where: { roomId: { in: roomIds } },
  });
  const deletedRooms = await prisma.room.deleteMany({
    where: { eventId },
  });
  const deletedUsers = await prisma.user.deleteMany({
    where: { eventId },
  });
  const deletedAnalyticsEvents = await prisma.analyticsEvent.deleteMany({
    where: { eventId },
  });

  const log = await prisma.retentionCleanupLog.create({
    data: {
      eventId,
      deletedSessions: deletedSessions.count,
      deletedVotes: deletedVotes.count,
      deletedDecisionCommits: deletedDecisionCommits.count,
      deletedArtifacts: deletedArtifacts.count,
      deletedUserBadges: deletedUserBadges.count,
      deletedRoomMembers: deletedRoomMembers.count,
      deletedRooms: deletedRooms.count,
      deletedUsers: deletedUsers.count,
      deletedAnalyticsEvents: deletedAnalyticsEvents.count,
      triggeredBy,
    },
  });

  return {
    eventId,
    eventName: event.name,
    deletedSessions: deletedSessions.count,
    deletedVotes: deletedVotes.count,
    deletedDecisionCommits: deletedDecisionCommits.count,
    deletedArtifacts: deletedArtifacts.count,
    deletedUserBadges: deletedUserBadges.count,
    deletedRoomMembers: deletedRoomMembers.count,
    deletedRooms: deletedRooms.count,
    deletedUsers: deletedUsers.count,
    deletedAnalyticsEvents: deletedAnalyticsEvents.count,
    logId: log.id,
  };
}

/** Run cleanup for all eligible events. */
export async function runCleanupForAllEligible(
  triggeredBy: string | null = null
): Promise<CleanupResult[]> {
  const eligible = await getEligibleEventIds();
  const results: CleanupResult[] = [];
  for (const e of eligible) {
    const r = await runCleanupForEvent(e.id, triggeredBy);
    if (r) results.push(r);
  }
  return results;
}
