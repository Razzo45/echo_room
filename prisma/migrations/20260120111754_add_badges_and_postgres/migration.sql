-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('DECISION_ROOM', 'FORM', 'SURVEY');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'MULTI_SELECT', 'DATE', 'NUMBER');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('OPEN', 'FULL', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('EVENT_CODE_VALIDATED', 'PROFILE_CREATED', 'QUEST_STARTED', 'QUEST_COMPLETED', 'ROOM_CREATED', 'ROOM_COMPLETED', 'ARTIFACT_VIEWED', 'ARTIFACT_DOWNLOADED');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('FIRST_QUEST_COMPLETE', 'TEAM_PLAYER', 'COLLABORATOR', 'STORYTELLER', 'DECISION_MAKER', 'ARTIFACT_CREATOR', 'QUEST_MASTER', 'SOCIAL_CONNECTOR', 'PERFECT_TEAM', 'EARLY_BIRD', 'NIGHT_OWL', 'CONSENSUS_BUILDER', 'DIVERSITY_CHAMPION');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "brandColor" TEXT NOT NULL DEFAULT '#0ea5e9',
    "logoUrl" TEXT,
    "sponsorLogos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "curiosity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventCodeId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "questType" "QuestType" NOT NULL DEFAULT 'DECISION_ROOM',
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "teamSize" INTEGER NOT NULL DEFAULT 3,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "decisionsData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestDecision" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "decisionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestOption" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "optionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "impact" TEXT NOT NULL DEFAULT '',
    "tradeoff" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestField" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL DEFAULT 'TEXT',
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestResponse" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responses" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'OPEN',
    "currentDecision" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decisionNumber" INTEGER NOT NULL,
    "optionKey" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionCommit" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "decisionNumber" INTEGER NOT NULL,
    "committedOption" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionCommit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" "AnalyticsEventType" NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "badgeType" "BadgeType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "roomId" TEXT,
    "metadata" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCode_code_key" ON "EventCode"("code");

-- CreateIndex
CREATE INDEX "User_eventId_idx" ON "User"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "QuestDecision_questId_decisionNumber_key" ON "QuestDecision"("questId", "decisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QuestOption_decisionId_optionKey_key" ON "QuestOption"("decisionId", "optionKey");

-- CreateIndex
CREATE UNIQUE INDEX "QuestField_questId_fieldKey_key" ON "QuestField"("questId", "fieldKey");

-- CreateIndex
CREATE INDEX "QuestResponse_questId_idx" ON "QuestResponse"("questId");

-- CreateIndex
CREATE INDEX "QuestResponse_userId_idx" ON "QuestResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestResponse_questId_userId_key" ON "QuestResponse"("questId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_roomCode_key" ON "Room"("roomCode");

-- CreateIndex
CREATE INDEX "Room_status_questId_idx" ON "Room"("status", "questId");

-- CreateIndex
CREATE INDEX "Room_eventId_status_idx" ON "Room"("eventId", "status");

-- CreateIndex
CREATE INDEX "Room_completedAt_idx" ON "Room"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMember_roomId_userId_key" ON "RoomMember"("roomId", "userId");

-- CreateIndex
CREATE INDEX "Vote_roomId_decisionNumber_idx" ON "Vote"("roomId", "decisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_roomId_userId_decisionNumber_key" ON "Vote"("roomId", "userId", "decisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionCommit_roomId_decisionNumber_key" ON "DecisionCommit"("roomId", "decisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_roomId_key" ON "Artifact"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_shareToken_key" ON "Artifact"("shareToken");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventId_eventType_idx" ON "AnalyticsEvent"("eventId", "eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_badgeType_key" ON "Badge"("badgeType");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE INDEX "UserBadge_earnedAt_idx" ON "UserBadge"("earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_roomId_key" ON "UserBadge"("userId", "badgeId", "roomId");

-- AddForeignKey
ALTER TABLE "EventCode" ADD CONSTRAINT "EventCode_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_eventCodeId_fkey" FOREIGN KEY ("eventCodeId") REFERENCES "EventCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestDecision" ADD CONSTRAINT "QuestDecision_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestOption" ADD CONSTRAINT "QuestOption_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "QuestDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestField" ADD CONSTRAINT "QuestField_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionCommit" ADD CONSTRAINT "DecisionCommit_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
