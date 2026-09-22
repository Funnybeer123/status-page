-- AlterTable
ALTER TABLE "Document" ADD COLUMN "transcribedById" TEXT;
ALTER TABLE "Document" ADD COLUMN "transcriptLockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LandRecord" ADD COLUMN "assetId" TEXT;

-- AlterTable
ALTER TABLE "PersonFollow" ADD COLUMN "mutedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "HeirloomHold" (
    "id" TEXT NOT NULL,
    "heirloomId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "heldFrom" DATE,
    "heldUntil" DATE,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeirloomHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMeeting" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "happenedOn" DATE,
    "notes" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMeetingPerson" (
    "meetingId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "FamilyMeetingPerson_pkey" PRIMARY KEY ("meetingId","personId")
);

-- CreateIndex
CREATE INDEX "HeirloomHold_heirloomId_heldFrom_idx" ON "HeirloomHold"("heirloomId", "heldFrom");
CREATE INDEX "FamilyMeeting_familyId_happenedOn_idx" ON "FamilyMeeting"("familyId", "happenedOn");
CREATE INDEX "Document_transcribedById_idx" ON "Document"("transcribedById");
CREATE INDEX "LandRecord_assetId_idx" ON "LandRecord"("assetId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_transcribedById_fkey" FOREIGN KEY ("transcribedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LandRecord" ADD CONSTRAINT "LandRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HeirloomHold" ADD CONSTRAINT "HeirloomHold_heirloomId_fkey" FOREIGN KEY ("heirloomId") REFERENCES "Heirloom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HeirloomHold" ADD CONSTRAINT "HeirloomHold_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyMeeting" ADD CONSTRAINT "FamilyMeeting_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyMeeting" ADD CONSTRAINT "FamilyMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyMeetingPerson" ADD CONSTRAINT "FamilyMeetingPerson_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "FamilyMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyMeetingPerson" ADD CONSTRAINT "FamilyMeetingPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
