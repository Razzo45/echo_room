-- CreateEnum
CREATE TYPE "AIGenerationStatus" AS ENUM ('IDLE', 'GENERATING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "aiBrief" TEXT,
ADD COLUMN     "aiGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "aiGenerationStatus" "AIGenerationStatus" NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "aiGenerationVersion" TEXT;

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "eventGenerationId" TEXT;

-- CreateTable
CREATE TABLE "EventGeneration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "AIGenerationStatus" NOT NULL DEFAULT 'GENERATING',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "model" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventGeneration_eventId_idx" ON "EventGeneration"("eventId");

-- CreateIndex
CREATE INDEX "EventGeneration_status_idx" ON "EventGeneration"("status");

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_eventGenerationId_fkey" FOREIGN KEY ("eventGenerationId") REFERENCES "EventGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGeneration" ADD CONSTRAINT "EventGeneration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
