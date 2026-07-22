-- AlterTable
ALTER TABLE "Room" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Room" ADD COLUMN "contentVersionId" TEXT;

-- CreateEnum
CREATE TYPE "ForumPostType" AS ENUM ('UPDATE', 'SPEAKER', 'PANEL', 'NEWSLETTER');
CREATE TYPE "PlayInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "EventForumPost" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "organiserId" TEXT NOT NULL,
    "type" "ForumPostType" NOT NULL DEFAULT 'UPDATE',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "seedPlayspace" BOOLEAN NOT NULL DEFAULT false,
    "seededQuestId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventForumPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayInvite" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "questId" TEXT,
    "roomId" TEXT,
    "status" "PlayInviteStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventForumPost_eventId_published_publishedAt_idx" ON "EventForumPost"("eventId", "published", "publishedAt");
CREATE INDEX "EventForumPost_eventId_pinned_idx" ON "EventForumPost"("eventId", "pinned");
CREATE INDEX "PlayInvite_eventId_toUserId_status_idx" ON "PlayInvite"("eventId", "toUserId", "status");
CREATE INDEX "PlayInvite_eventId_fromUserId_status_idx" ON "PlayInvite"("eventId", "fromUserId", "status");
CREATE INDEX "Room_contentVersionId_idx" ON "Room"("contentVersionId");
CREATE INDEX "Room_isPrivate_idx" ON "Room"("isPrivate");

ALTER TABLE "EventForumPost" ADD CONSTRAINT "EventForumPost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventForumPost" ADD CONSTRAINT "EventForumPost_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "Organiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayInvite" ADD CONSTRAINT "PlayInvite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayInvite" ADD CONSTRAINT "PlayInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayInvite" ADD CONSTRAINT "PlayInvite_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayInvite" ADD CONSTRAINT "PlayInvite_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_contentVersionId_fkey" FOREIGN KEY ("contentVersionId") REFERENCES "EventForumPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
