-- AlterTable
ALTER TABLE "User" ADD COLUMN "nightMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LifeEvent" ADD COLUMN "firstTag" TEXT;
ALTER TABLE "Document" ADD COLUMN "envelopeFrom" TEXT;
ALTER TABLE "Document" ADD COLUMN "envelopeTo" TEXT;
ALTER TABLE "Document" ADD COLUMN "envelopeAssetId" TEXT;
ALTER TABLE "Document" ADD COLUMN "holidayId" TEXT;
ALTER TABLE "Person" ADD COLUMN "pronunciationAssetId" TEXT;

-- CreateTable
CREATE TABLE "FamilyVaultNote" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyVaultNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyVaultNote_familyId_idx" ON "FamilyVaultNote"("familyId");
CREATE INDEX "Document_holidayId_idx" ON "Document"("holidayId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_envelopeAssetId_fkey" FOREIGN KEY ("envelopeAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_holidayId_fkey" FOREIGN KEY ("holidayId") REFERENCES "FamilyHoliday"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FamilyVaultNote" ADD CONSTRAINT "FamilyVaultNote_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyVaultNote" ADD CONSTRAINT "FamilyVaultNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
