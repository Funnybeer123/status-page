-- AlterTable
ALTER TABLE "Place" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Place" ADD COLUMN "kind" TEXT;

-- AlterTable
ALTER TABLE "LifeEvent" ADD COLUMN "rangeEnd" DATE;

-- CreateTable
CREATE TABLE "AdoptionPaper" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "documentId" TEXT,
    "grantedOn" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdoptionPaper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Place_parentId_idx" ON "Place"("parentId");
CREATE UNIQUE INDEX "AdoptionPaper_relationshipId_key" ON "AdoptionPaper"("relationshipId");
CREATE INDEX "AdoptionPaper_familyId_idx" ON "AdoptionPaper"("familyId");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdoptionPaper" ADD CONSTRAINT "AdoptionPaper_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdoptionPaper" ADD CONSTRAINT "AdoptionPaper_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "Relationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdoptionPaper" ADD CONSTRAINT "AdoptionPaper_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
