-- AlterTable
ALTER TABLE "Artifact" ADD COLUMN     "pdfContent" TEXT,
ALTER COLUMN "pdfPath" DROP NOT NULL;
