-- AlterTable
ALTER TABLE "FamilyMotto" ADD COLUMN "preferred" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Hunt" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hunt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuntClue" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "huntId" TEXT NOT NULL,
    "clue" TEXT NOT NULL,
    "targetKind" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "citation" TEXT,
    "documentId" TEXT,
    "assetId" TEXT,
    "placeId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HuntClue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacePin" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentId" TEXT,
    "storyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacePin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterDraft" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchChecklistItem" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Hunt_familyId_createdAt_idx" ON "Hunt"("familyId", "createdAt");
CREATE INDEX "HuntClue_familyId_huntId_idx" ON "HuntClue"("familyId", "huntId");
CREATE INDEX "PlacePin_familyId_placeId_idx" ON "PlacePin"("familyId", "placeId");
CREATE UNIQUE INDEX "NewsletterDraft_familyId_month_key" ON "NewsletterDraft"("familyId", "month");
CREATE UNIQUE INDEX "ResearchChecklistItem_familyId_kind_key" ON "ResearchChecklistItem"("familyId", "kind");
CREATE INDEX "ResearchChecklistItem_familyId_idx" ON "ResearchChecklistItem"("familyId");

-- AddForeignKey
ALTER TABLE "Hunt" ADD CONSTRAINT "Hunt_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HuntClue" ADD CONSTRAINT "HuntClue_huntId_fkey" FOREIGN KEY ("huntId") REFERENCES "Hunt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HuntClue" ADD CONSTRAINT "HuntClue_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HuntClue" ADD CONSTRAINT "HuntClue_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HuntClue" ADD CONSTRAINT "HuntClue_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlacePin" ADD CONSTRAINT "PlacePin_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlacePin" ADD CONSTRAINT "PlacePin_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlacePin" ADD CONSTRAINT "PlacePin_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlacePin" ADD CONSTRAINT "PlacePin_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NewsletterDraft" ADD CONSTRAINT "NewsletterDraft_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchChecklistItem" ADD CONSTRAINT "ResearchChecklistItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
