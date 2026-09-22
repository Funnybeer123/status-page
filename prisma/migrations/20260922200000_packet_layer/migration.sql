-- AlterTable
ALTER TABLE "Person" ADD COLUMN "pronunciation" TEXT;

-- AlterTable
ALTER TABLE "PersonTag" ADD COLUMN "x" DOUBLE PRECISION;
ALTER TABLE "PersonTag" ADD COLUMN "y" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Citation" ADD COLUMN "quality" TEXT;

-- AlterTable
ALTER TABLE "ResearchTask" ADD COLUMN "assetId" TEXT;

-- AlterTable
ALTER TABLE "StoryPromptAnswer" ADD COLUMN "assetId" TEXT;

-- CreateTable
CREATE TABLE "ReunionDish" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "reunionId" TEXT NOT NULL,
    "personId" TEXT,
    "recipeId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReunionDish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReunionDish_familyId_reunionId_idx" ON "ReunionDish"("familyId", "reunionId");

-- AddForeignKey
ALTER TABLE "ResearchTask" ADD CONSTRAINT "ResearchTask_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoryPromptAnswer" ADD CONSTRAINT "StoryPromptAnswer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReunionDish" ADD CONSTRAINT "ReunionDish_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionDish" ADD CONSTRAINT "ReunionDish_reunionId_fkey" FOREIGN KEY ("reunionId") REFERENCES "ReunionGathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionDish" ADD CONSTRAINT "ReunionDish_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReunionDish" ADD CONSTRAINT "ReunionDish_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
