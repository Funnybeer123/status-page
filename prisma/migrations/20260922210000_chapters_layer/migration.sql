-- AlterTable
ALTER TABLE "Person" ADD COLUMN "ownerNote" TEXT;

-- AlterTable
ALTER TABLE "Cemetery" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Cemetery" ADD COLUMN "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "LandRecord" ADD COLUMN "homeId" TEXT;
ALTER TABLE "LandRecord" ADD COLUMN "abstract" TEXT;

-- AlterTable
ALTER TABLE "MilitaryService" ADD COLUMN "unitId" TEXT;

-- CreateTable
CREATE TABLE "LifeChapter" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifeChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmMoment" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmMoment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilitaryUnit" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branch" TEXT,
    "place" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilitaryUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyHymn" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "verse" TEXT,
    "occasion" TEXT,
    "notes" TEXT,

    CONSTRAINT "FamilyHymn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyFarm" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "homeId" TEXT,
    "title" TEXT NOT NULL,
    "place" TEXT,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "FamilyFarm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LifeChapter_familyId_personId_idx" ON "LifeChapter"("familyId", "personId");
CREATE INDEX "FilmMoment_familyId_assetId_idx" ON "FilmMoment"("familyId", "assetId");
CREATE INDEX "MilitaryUnit_familyId_idx" ON "MilitaryUnit"("familyId");
CREATE INDEX "FamilyHymn_familyId_idx" ON "FamilyHymn"("familyId");
CREATE INDEX "FamilyFarm_familyId_idx" ON "FamilyFarm"("familyId");

-- AddForeignKey
ALTER TABLE "LandRecord" ADD CONSTRAINT "LandRecord_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "FamilyHome"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MilitaryService" ADD CONSTRAINT "MilitaryService_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "MilitaryUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LifeChapter" ADD CONSTRAINT "LifeChapter_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LifeChapter" ADD CONSTRAINT "LifeChapter_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilmMoment" ADD CONSTRAINT "FilmMoment_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilmMoment" ADD CONSTRAINT "FilmMoment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MilitaryUnit" ADD CONSTRAINT "MilitaryUnit_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyHymn" ADD CONSTRAINT "FamilyHymn_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyFarm" ADD CONSTRAINT "FamilyFarm_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyFarm" ADD CONSTRAINT "FamilyFarm_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "FamilyHome"("id") ON DELETE SET NULL ON UPDATE CASCADE;
