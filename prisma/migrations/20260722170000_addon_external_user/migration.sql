-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "externalUserId" TEXT;

-- Unique per event when externalUserId is set (Postgres allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS "User_eventId_externalUserId_key" ON "User"("eventId", "externalUserId");
