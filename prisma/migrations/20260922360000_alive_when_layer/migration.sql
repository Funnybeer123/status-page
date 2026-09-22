-- AlterTable
ALTER TABLE "ReunionGuest" ADD COLUMN "arrived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ReunionGuest" ADD COLUMN "arrivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PhotoGuess" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT,
    "name" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoGuess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReunionShopItem" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "reunionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReunionShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceName" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrashAudit" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrashAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadLater" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT,
    "storyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadLater_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhotoGuess_familyId_assetId_idx" ON "PhotoGuess"("familyId", "assetId");
CREATE INDEX "ReunionShopItem_familyId_reunionId_idx" ON "ReunionShopItem"("familyId", "reunionId");
CREATE INDEX "PlaceName_familyId_placeId_idx" ON "PlaceName"("familyId", "placeId");
CREATE INDEX "TrashAudit_familyId_createdAt_idx" ON "TrashAudit"("familyId", "createdAt");
CREATE INDEX "ReadLater_familyId_userId_idx" ON "ReadLater"("familyId", "userId");

-- AddForeignKey
ALTER TABLE "PhotoGuess" ADD CONSTRAINT "PhotoGuess_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhotoGuess" ADD CONSTRAINT "PhotoGuess_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhotoGuess" ADD CONSTRAINT "PhotoGuess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhotoGuess" ADD CONSTRAINT "PhotoGuess_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReunionShopItem" ADD CONSTRAINT "ReunionShopItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionShopItem" ADD CONSTRAINT "ReunionShopItem_reunionId_fkey" FOREIGN KEY ("reunionId") REFERENCES "ReunionGathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaceName" ADD CONSTRAINT "PlaceName_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaceName" ADD CONSTRAINT "PlaceName_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrashAudit" ADD CONSTRAINT "TrashAudit_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrashAudit" ADD CONSTRAINT "TrashAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadLater" ADD CONSTRAINT "ReadLater_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadLater" ADD CONSTRAINT "ReadLater_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadLater" ADD CONSTRAINT "ReadLater_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadLater" ADD CONSTRAINT "ReadLater_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
