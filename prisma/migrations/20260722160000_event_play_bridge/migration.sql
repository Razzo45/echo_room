-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "offerPrivateRoomOnAccept" BOOLEAN NOT NULL DEFAULT false;
