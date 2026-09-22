-- AlterEnum
ALTER TYPE "DocKind" ADD VALUE 'capsule';

-- CreateTable
CREATE TABLE "TimeCapsule" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "addresseeName" TEXT NOT NULL,
    "addresseePersonId" TEXT,
    "fromPersonId" TEXT,
    "openOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeCapsule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAnswer" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonChange" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyBranch" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyBranchPerson" (
    "branchId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "FamilyBranchPerson_pkey" PRIMARY KEY ("branchId","personId")
);

-- CreateTable
CREATE TABLE "Cemetery" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locality" TEXT,
    "region" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cemetery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CemeteryPlot" (
    "id" TEXT NOT NULL,
    "cemeteryId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "plot" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CemeteryPlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoPair" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thenAssetId" TEXT NOT NULL,
    "nowAssetId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voyage" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "ship" TEXT NOT NULL,
    "departedFrom" TEXT NOT NULL,
    "arrivedAt" TEXT NOT NULL,
    "departedOn" DATE,
    "arrivedOn" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voyage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoyagePerson" (
    "voyageId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "VoyagePerson_pkey" PRIMARY KEY ("voyageId","personId")
);

-- CreateTable
CREATE TABLE "Schooling" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "place" TEXT,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "Schooling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReunionGathering" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "happenedOn" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReunionGathering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReunionGuest" (
    "reunionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "coming" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ReunionGuest_pkey" PRIMARY KEY ("reunionId","personId")
);

-- CreateTable
CREATE TABLE "OccupationRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "employer" TEXT,
    "place" TEXT,
    "startedOn" DATE,
    "endedOn" DATE,

    CONSTRAINT "OccupationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Godparent" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "godparentId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Godparent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Congregation" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "place" TEXT,
    "startedOn" DATE,
    "endedOn" DATE,

    CONSTRAINT "Congregation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "acquiredOn" DATE,
    "notes" TEXT,

    CONSTRAINT "LandRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilitaryService" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "unit" TEXT,
    "rank" TEXT,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "MilitaryService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "holderId" TEXT,
    "body" TEXT NOT NULL,
    "recordedAt" DATE,

    CONSTRAINT "BibleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMotto" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT,
    "notes" TEXT,

    CONSTRAINT "FamilyMotto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassportRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "numberNote" TEXT,
    "issuedOn" DATE,
    "place" TEXT,
    "notes" TEXT,

    CONSTRAINT "PassportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeCapsule_documentId_key" ON "TimeCapsule"("documentId");

-- CreateIndex
CREATE INDEX "TimeCapsule_familyId_openOn_idx" ON "TimeCapsule"("familyId", "openOn");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewAnswer_personId_promptKey_key" ON "InterviewAnswer"("personId", "promptKey");

-- CreateIndex
CREATE INDEX "InterviewAnswer_familyId_idx" ON "InterviewAnswer"("familyId");

-- CreateIndex
CREATE INDEX "PersonChange_personId_createdAt_idx" ON "PersonChange"("personId", "createdAt");

-- CreateIndex
CREATE INDEX "PersonChange_familyId_idx" ON "PersonChange"("familyId");

-- CreateIndex
CREATE INDEX "FamilyBranch_familyId_idx" ON "FamilyBranch"("familyId");

-- CreateIndex
CREATE INDEX "Cemetery_familyId_idx" ON "Cemetery"("familyId");

-- CreateIndex
CREATE INDEX "CemeteryPlot_cemeteryId_idx" ON "CemeteryPlot"("cemeteryId");

-- CreateIndex
CREATE INDEX "PhotoPair_familyId_idx" ON "PhotoPair"("familyId");

-- CreateIndex
CREATE INDEX "Voyage_familyId_idx" ON "Voyage"("familyId");

-- CreateIndex
CREATE INDEX "Schooling_familyId_personId_idx" ON "Schooling"("familyId", "personId");

-- CreateIndex
CREATE INDEX "ReunionGathering_familyId_happenedOn_idx" ON "ReunionGathering"("familyId", "happenedOn");

-- CreateIndex
CREATE INDEX "OccupationRecord_familyId_personId_idx" ON "OccupationRecord"("familyId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "Godparent_childId_godparentId_key" ON "Godparent"("childId", "godparentId");

-- CreateIndex
CREATE INDEX "Godparent_familyId_idx" ON "Godparent"("familyId");

-- CreateIndex
CREATE INDEX "Congregation_familyId_personId_idx" ON "Congregation"("familyId", "personId");

-- CreateIndex
CREATE INDEX "LandRecord_familyId_personId_idx" ON "LandRecord"("familyId", "personId");

-- CreateIndex
CREATE INDEX "MilitaryService_familyId_personId_idx" ON "MilitaryService"("familyId", "personId");

-- CreateIndex
CREATE INDEX "BibleRecord_familyId_idx" ON "BibleRecord"("familyId");

-- CreateIndex
CREATE INDEX "FamilyMotto_familyId_idx" ON "FamilyMotto"("familyId");

-- CreateIndex
CREATE INDEX "PassportRecord_familyId_personId_idx" ON "PassportRecord"("familyId", "personId");

-- AddForeignKey
ALTER TABLE "TimeCapsule" ADD CONSTRAINT "TimeCapsule_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeCapsule" ADD CONSTRAINT "TimeCapsule_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeCapsule" ADD CONSTRAINT "TimeCapsule_addresseePersonId_fkey" FOREIGN KEY ("addresseePersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeCapsule" ADD CONSTRAINT "TimeCapsule_fromPersonId_fkey" FOREIGN KEY ("fromPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonChange" ADD CONSTRAINT "PersonChange_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonChange" ADD CONSTRAINT "PersonChange_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonChange" ADD CONSTRAINT "PersonChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyBranch" ADD CONSTRAINT "FamilyBranch_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyBranchPerson" ADD CONSTRAINT "FamilyBranchPerson_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "FamilyBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyBranchPerson" ADD CONSTRAINT "FamilyBranchPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cemetery" ADD CONSTRAINT "Cemetery_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CemeteryPlot" ADD CONSTRAINT "CemeteryPlot_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CemeteryPlot" ADD CONSTRAINT "CemeteryPlot_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoPair" ADD CONSTRAINT "PhotoPair_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoPair" ADD CONSTRAINT "PhotoPair_thenAssetId_fkey" FOREIGN KEY ("thenAssetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoPair" ADD CONSTRAINT "PhotoPair_nowAssetId_fkey" FOREIGN KEY ("nowAssetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voyage" ADD CONSTRAINT "Voyage_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoyagePerson" ADD CONSTRAINT "VoyagePerson_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "Voyage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoyagePerson" ADD CONSTRAINT "VoyagePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schooling" ADD CONSTRAINT "Schooling_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schooling" ADD CONSTRAINT "Schooling_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReunionGathering" ADD CONSTRAINT "ReunionGathering_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReunionGuest" ADD CONSTRAINT "ReunionGuest_reunionId_fkey" FOREIGN KEY ("reunionId") REFERENCES "ReunionGathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReunionGuest" ADD CONSTRAINT "ReunionGuest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationRecord" ADD CONSTRAINT "OccupationRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupationRecord" ADD CONSTRAINT "OccupationRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Godparent" ADD CONSTRAINT "Godparent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Godparent" ADD CONSTRAINT "Godparent_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Godparent" ADD CONSTRAINT "Godparent_godparentId_fkey" FOREIGN KEY ("godparentId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Congregation" ADD CONSTRAINT "Congregation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Congregation" ADD CONSTRAINT "Congregation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandRecord" ADD CONSTRAINT "LandRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandRecord" ADD CONSTRAINT "LandRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilitaryService" ADD CONSTRAINT "MilitaryService_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilitaryService" ADD CONSTRAINT "MilitaryService_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleRecord" ADD CONSTRAINT "BibleRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleRecord" ADD CONSTRAINT "BibleRecord_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMotto" ADD CONSTRAINT "FamilyMotto_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportRecord" ADD CONSTRAINT "PassportRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportRecord" ADD CONSTRAINT "PassportRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
