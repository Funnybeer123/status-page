-- AlterTable
ALTER TABLE "Family" ADD COLUMN "rulesText" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "postage" TEXT;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "spokenById" TEXT;

-- CreateTable
CREATE TABLE "InterviewPlan" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "scheduledOn" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewPlan_familyId_scheduledOn_idx" ON "InterviewPlan"("familyId", "scheduledOn");
CREATE INDEX "Asset_spokenById_idx" ON "Asset"("spokenById");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_spokenById_fkey" FOREIGN KEY ("spokenById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewPlan" ADD CONSTRAINT "InterviewPlan_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewPlan" ADD CONSTRAINT "InterviewPlan_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
