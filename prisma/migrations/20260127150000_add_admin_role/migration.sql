-- AlterEnum
-- Add ADMIN value to OrganiserRole enum
ALTER TYPE "OrganiserRole" ADD VALUE 'ADMIN';

-- AlterTable
-- Add lastLoginAt field if it doesn't exist (safe to run multiple times)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Organiser' AND column_name = 'lastLoginAt'
    ) THEN
        ALTER TABLE "Organiser" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
    END IF;
END $$;

-- CreateTable (if OrganiserSession doesn't exist)
CREATE TABLE IF NOT EXISTS "OrganiserSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "organiserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganiserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OrganiserSession_token_key" ON "OrganiserSession"("token");
CREATE INDEX IF NOT EXISTS "OrganiserSession_organiserId_idx" ON "OrganiserSession"("organiserId");

-- AddForeignKey (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'OrganiserSession_organiserId_fkey'
    ) THEN
        ALTER TABLE "OrganiserSession" ADD CONSTRAINT "OrganiserSession_organiserId_fkey" 
        FOREIGN KEY ("organiserId") REFERENCES "Organiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
