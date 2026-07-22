-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "aiScenarioSlots" JSONB;
