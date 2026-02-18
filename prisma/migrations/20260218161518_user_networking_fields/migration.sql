-- AlterTable
ALTER TABLE "User" ADD COLUMN     "headline" TEXT,
ADD COLUMN     "isDiscoverable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkedinUrl" TEXT;

-- CreateIndex
CREATE INDEX "User_eventId_isDiscoverable_idx" ON "User"("eventId", "isDiscoverable");
