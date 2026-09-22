-- AlterTable
ALTER TABLE "User" ADD COLUMN "askPreferTranslation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN "favoriteAssetId" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "foldPattern" TEXT;

-- CreateTable
CREATE TABLE "InheritanceItem" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "documentId" TEXT,
    "probateId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InheritanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReunionShift" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "reunionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startsAt" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReunionShift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InheritanceItem_familyId_idx" ON "InheritanceItem"("familyId");
CREATE INDEX "InheritanceItem_personId_idx" ON "InheritanceItem"("personId");
CREATE INDEX "ReunionShift_familyId_reunionId_idx" ON "ReunionShift"("familyId", "reunionId");
CREATE INDEX "Person_favoriteAssetId_idx" ON "Person"("favoriteAssetId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_favoriteAssetId_fkey" FOREIGN KEY ("favoriteAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InheritanceItem" ADD CONSTRAINT "InheritanceItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InheritanceItem" ADD CONSTRAINT "InheritanceItem_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InheritanceItem" ADD CONSTRAINT "InheritanceItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InheritanceItem" ADD CONSTRAINT "InheritanceItem_probateId_fkey" FOREIGN KEY ("probateId") REFERENCES "ProbateRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReunionShift" ADD CONSTRAINT "ReunionShift_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionShift" ADD CONSTRAINT "ReunionShift_reunionId_fkey" FOREIGN KEY ("reunionId") REFERENCES "ReunionGathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionShift" ADD CONSTRAINT "ReunionShift_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
