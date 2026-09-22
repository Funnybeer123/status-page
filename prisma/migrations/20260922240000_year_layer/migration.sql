-- AlterTable
ALTER TABLE "Family" ADD COLUMN "bannerText" TEXT;
ALTER TABLE "Family" ADD COLUMN "bannerNote" TEXT;

-- AlterTable
ALTER TABLE "ResearchTask" ADD COLUMN "assigneeId" TEXT;
CREATE INDEX "ResearchTask_assigneeId_idx" ON "ResearchTask"("assigneeId");
ALTER TABLE "ResearchTask" ADD CONSTRAINT "ResearchTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "DigitizeItem" ADD COLUMN "assigneeId" TEXT;
CREATE INDEX "DigitizeItem_assigneeId_idx" ON "DigitizeItem"("assigneeId");
ALTER TABLE "DigitizeItem" ADD CONSTRAINT "DigitizeItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CityDirectory" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT,
    "name" TEXT NOT NULL,
    "occupation" TEXT,
    "address" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CityDirectory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilitaryPaper" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "serviceId" TEXT,
    "documentId" TEXT,
    "kind" TEXT NOT NULL,
    "year" INTEGER,
    "numberNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilitaryPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "place" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClassPupil" (
    "classId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "SchoolClassPupil_pkey" PRIMARY KEY ("classId","personId")
);

-- CreateIndex
CREATE INDEX "CityDirectory_familyId_year_idx" ON "CityDirectory"("familyId", "year");
CREATE INDEX "MilitaryPaper_familyId_personId_idx" ON "MilitaryPaper"("familyId", "personId");
CREATE INDEX "SchoolClass_familyId_year_idx" ON "SchoolClass"("familyId", "year");

-- AddForeignKey
ALTER TABLE "CityDirectory" ADD CONSTRAINT "CityDirectory_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CityDirectory" ADD CONSTRAINT "CityDirectory_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MilitaryPaper" ADD CONSTRAINT "MilitaryPaper_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MilitaryPaper" ADD CONSTRAINT "MilitaryPaper_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MilitaryPaper" ADD CONSTRAINT "MilitaryPaper_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "MilitaryService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MilitaryPaper" ADD CONSTRAINT "MilitaryPaper_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolClassPupil" ADD CONSTRAINT "SchoolClassPupil_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolClassPupil" ADD CONSTRAINT "SchoolClassPupil_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
