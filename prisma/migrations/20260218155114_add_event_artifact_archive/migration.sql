-- CreateTable
CREATE TABLE "EventArtifactArchive" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "questName" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventArtifactArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventArtifactArchive_eventId_idx" ON "EventArtifactArchive"("eventId");

-- AddForeignKey
ALTER TABLE "EventArtifactArchive" ADD CONSTRAINT "EventArtifactArchive_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
