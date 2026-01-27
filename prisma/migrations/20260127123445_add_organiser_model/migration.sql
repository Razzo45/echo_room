-- CreateEnum
CREATE TYPE "OrganiserRole" AS ENUM ('ORGANISER', 'ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "Organiser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "OrganiserRole" NOT NULL DEFAULT 'ORGANISER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganiserSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "organiserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganiserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organiser_email_key" ON "Organiser"("email");

-- CreateIndex
CREATE INDEX "Organiser_email_idx" ON "Organiser"("email");

-- CreateIndex
CREATE INDEX "Organiser_role_idx" ON "Organiser"("role");

-- CreateIndex
CREATE UNIQUE INDEX "OrganiserSession_token_key" ON "OrganiserSession"("token");

-- CreateIndex
CREATE INDEX "OrganiserSession_token_idx" ON "OrganiserSession"("token");

-- CreateIndex
CREATE INDEX "OrganiserSession_organiserId_idx" ON "OrganiserSession"("organiserId");

-- AddForeignKey
ALTER TABLE "OrganiserSession" ADD CONSTRAINT "OrganiserSession_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "Organiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
