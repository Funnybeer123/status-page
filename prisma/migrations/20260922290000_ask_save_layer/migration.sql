-- AlterTable
ALTER TABLE "AskConversation" ADD COLUMN "storyId" TEXT;
CREATE UNIQUE INDEX "AskConversation_storyId_key" ON "AskConversation"("storyId");

-- AlterTable
ALTER TABLE "CemeteryPlot" ADD COLUMN "x" DOUBLE PRECISION;
ALTER TABLE "CemeteryPlot" ADD COLUMN "y" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "BibleRecord" ADD COLUMN "assetId" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "memorialPersonId" TEXT;

-- CreateTable
CREATE TABLE "ReunionBring" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "reunionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assetId" TEXT,
    "heirloomId" TEXT,
    "dishId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReunionBring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoticeMute" (
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeMute_pkey" PRIMARY KEY ("userId","familyId","category")
);

-- CreateIndex
CREATE INDEX "ReunionBring_familyId_reunionId_idx" ON "ReunionBring"("familyId", "reunionId");
CREATE INDEX "Document_memorialPersonId_idx" ON "Document"("memorialPersonId");

-- AddForeignKey
ALTER TABLE "AskConversation" ADD CONSTRAINT "AskConversation_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BibleRecord" ADD CONSTRAINT "BibleRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_memorialPersonId_fkey" FOREIGN KEY ("memorialPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReunionBring" ADD CONSTRAINT "ReunionBring_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionBring" ADD CONSTRAINT "ReunionBring_reunionId_fkey" FOREIGN KEY ("reunionId") REFERENCES "ReunionGathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionBring" ADD CONSTRAINT "ReunionBring_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionBring" ADD CONSTRAINT "ReunionBring_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReunionBring" ADD CONSTRAINT "ReunionBring_heirloomId_fkey" FOREIGN KEY ("heirloomId") REFERENCES "Heirloom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReunionBring" ADD CONSTRAINT "ReunionBring_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "ReunionDish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NoticeMute" ADD CONSTRAINT "NoticeMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoticeMute" ADD CONSTRAINT "NoticeMute_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
