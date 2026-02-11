-- AlterEnum
ALTER TYPE "RoomStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "debugCloneEventId" TEXT,
ADD COLUMN     "debugMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "debugSnapshot" JSONB,
ADD COLUMN     "isDebugClone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retentionOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retentionOverrideAt" TIMESTAMP(3),
ADD COLUMN     "retentionOverrideBy" TEXT;

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "minTeamSize" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "lastActivityAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RoomMember" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RetentionCleanupLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedSessions" INTEGER NOT NULL DEFAULT 0,
    "deletedVotes" INTEGER NOT NULL DEFAULT 0,
    "deletedDecisionCommits" INTEGER NOT NULL DEFAULT 0,
    "deletedArtifacts" INTEGER NOT NULL DEFAULT 0,
    "deletedUserBadges" INTEGER NOT NULL DEFAULT 0,
    "deletedRoomMembers" INTEGER NOT NULL DEFAULT 0,
    "deletedRooms" INTEGER NOT NULL DEFAULT 0,
    "deletedUsers" INTEGER NOT NULL DEFAULT 0,
    "deletedAnalyticsEvents" INTEGER NOT NULL DEFAULT 0,
    "triggeredBy" TEXT,

    CONSTRAINT "RetentionCleanupLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "organiserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetentionCleanupLog_eventId_idx" ON "RetentionCleanupLog"("eventId");

-- CreateIndex
CREATE INDEX "RetentionCleanupLog_runAt_idx" ON "RetentionCleanupLog"("runAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_organiserId_idx" ON "AdminAuditLog"("organiserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Room_status_lastActivityAt_idx" ON "Room"("status", "lastActivityAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_debugCloneEventId_fkey" FOREIGN KEY ("debugCloneEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionCleanupLog" ADD CONSTRAINT "RetentionCleanupLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "Organiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
