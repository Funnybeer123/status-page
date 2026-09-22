-- CreateTable
CREATE TABLE "HeirloomLoan" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "heirloomId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "borrowedOn" DATE NOT NULL,
    "dueOn" DATE,
    "returnedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "HeirloomLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyHome" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "placeId" TEXT,
    "title" TEXT NOT NULL,
    "line" TEXT,
    "locality" TEXT,
    "region" TEXT,
    "notes" TEXT,

    CONSTRAINT "FamilyHome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyHomePhoto" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "takenOn" TIMESTAMP(3),
    "caption" TEXT,

    CONSTRAINT "FamilyHomePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyHomeResident" (
    "homeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "startedOn" DATE,
    "endedOn" DATE,

    CONSTRAINT "FamilyHomeResident_pkey" PRIMARY KEY ("homeId","personId")
);

-- CreateTable
CREATE TABLE "DigitizeItem" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "holderId" TEXT,
    "notes" TEXT,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitizeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PinnedMemory" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "storyId" TEXT,
    "documentId" TEXT,
    "assetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinnedMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReunionPhoto" (
    "reunionId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "ReunionPhoto_pkey" PRIMARY KEY ("reunionId","assetId")
);

-- CreateTable
CREATE TABLE "HandwritingSample" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "documentId" TEXT,
    "assetId" TEXT,
    "notes" TEXT,

    CONSTRAINT "HandwritingSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GravestoneInscription" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "place" TEXT,

    CONSTRAINT "GravestoneInscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyHoliday" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "season" TEXT,
    "notes" TEXT,

    CONSTRAINT "FamilyHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeirloomLoan_familyId_dueOn_idx" ON "HeirloomLoan"("familyId", "dueOn");

-- CreateIndex
CREATE INDEX "FamilyHome_familyId_idx" ON "FamilyHome"("familyId");

-- CreateIndex
CREATE INDEX "FamilyHomePhoto_homeId_takenOn_idx" ON "FamilyHomePhoto"("homeId", "takenOn");

-- CreateIndex
CREATE INDEX "DigitizeItem_familyId_doneAt_idx" ON "DigitizeItem"("familyId", "doneAt");

-- CreateIndex
CREATE INDEX "PinnedMemory_familyId_createdAt_idx" ON "PinnedMemory"("familyId", "createdAt");

-- CreateIndex
CREATE INDEX "HandwritingSample_familyId_personId_idx" ON "HandwritingSample"("familyId", "personId");

-- CreateIndex
CREATE INDEX "GravestoneInscription_familyId_personId_idx" ON "GravestoneInscription"("familyId", "personId");

-- CreateIndex
CREATE INDEX "FamilyHoliday_familyId_idx" ON "FamilyHoliday"("familyId");

-- AddForeignKey
ALTER TABLE "HeirloomLoan" ADD CONSTRAINT "HeirloomLoan_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HeirloomLoan" ADD CONSTRAINT "HeirloomLoan_heirloomId_fkey" FOREIGN KEY ("heirloomId") REFERENCES "Heirloom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HeirloomLoan" ADD CONSTRAINT "HeirloomLoan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyHome" ADD CONSTRAINT "FamilyHome_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyHome" ADD CONSTRAINT "FamilyHome_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FamilyHomePhoto" ADD CONSTRAINT "FamilyHomePhoto_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "FamilyHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyHomePhoto" ADD CONSTRAINT "FamilyHomePhoto_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyHomeResident" ADD CONSTRAINT "FamilyHomeResident_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "FamilyHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyHomeResident" ADD CONSTRAINT "FamilyHomeResident_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DigitizeItem" ADD CONSTRAINT "DigitizeItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DigitizeItem" ADD CONSTRAINT "DigitizeItem_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PinnedMemory" ADD CONSTRAINT "PinnedMemory_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PinnedMemory" ADD CONSTRAINT "PinnedMemory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PinnedMemory" ADD CONSTRAINT "PinnedMemory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PinnedMemory" ADD CONSTRAINT "PinnedMemory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReunionPhoto" ADD CONSTRAINT "ReunionPhoto_reunionId_fkey" FOREIGN KEY ("reunionId") REFERENCES "ReunionGathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionPhoto" ADD CONSTRAINT "ReunionPhoto_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandwritingSample" ADD CONSTRAINT "HandwritingSample_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandwritingSample" ADD CONSTRAINT "HandwritingSample_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandwritingSample" ADD CONSTRAINT "HandwritingSample_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HandwritingSample" ADD CONSTRAINT "HandwritingSample_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GravestoneInscription" ADD CONSTRAINT "GravestoneInscription_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GravestoneInscription" ADD CONSTRAINT "GravestoneInscription_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyHoliday" ADD CONSTRAINT "FamilyHoliday_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
