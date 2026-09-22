-- AlterTable
ALTER TABLE "Place" ADD COLUMN "gps" TEXT;
ALTER TABLE "PersonName" ADD COLUMN "notes" TEXT;

-- CreateTable
CREATE TABLE "HuntFinish" (
    "huntId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HuntFinish_pkey" PRIMARY KEY ("huntId","userId")
);

-- CreateTable
CREATE TABLE "ReunionSeat" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "reunionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "seat" INTEGER,

    CONSTRAINT "ReunionSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyVisit" (
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousAt" TIMESTAMP(3),

    CONSTRAINT "FamilyVisit_pkey" PRIMARY KEY ("userId","familyId")
);

-- CreateTable
CREATE TABLE "LifeDraft" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HuntFinish_familyId_idx" ON "HuntFinish"("familyId");
CREATE UNIQUE INDEX "ReunionSeat_reunionId_personId_key" ON "ReunionSeat"("reunionId", "personId");
CREATE INDEX "ReunionSeat_familyId_reunionId_idx" ON "ReunionSeat"("familyId", "reunionId");
CREATE UNIQUE INDEX "LifeDraft_familyId_personId_key" ON "LifeDraft"("familyId", "personId");

-- AddForeignKey
ALTER TABLE "HuntFinish" ADD CONSTRAINT "HuntFinish_huntId_fkey" FOREIGN KEY ("huntId") REFERENCES "Hunt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HuntFinish" ADD CONSTRAINT "HuntFinish_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HuntFinish" ADD CONSTRAINT "HuntFinish_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionSeat" ADD CONSTRAINT "ReunionSeat_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionSeat" ADD CONSTRAINT "ReunionSeat_reunionId_fkey" FOREIGN KEY ("reunionId") REFERENCES "ReunionGathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionSeat" ADD CONSTRAINT "ReunionSeat_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyVisit" ADD CONSTRAINT "FamilyVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyVisit" ADD CONSTRAINT "FamilyVisit_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LifeDraft" ADD CONSTRAINT "LifeDraft_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LifeDraft" ADD CONSTRAINT "LifeDraft_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
