-- AlterTable
ALTER TABLE "Family" ADD COLUMN "nameStyle" TEXT;
ALTER TABLE "Family" ADD COLUMN "dateStyle" TEXT;

-- CreateTable
CREATE TABLE "PersonVisit" (
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonVisit_pkey" PRIMARY KEY ("userId","personId")
);

-- CreateTable
CREATE TABLE "PhotoRestore" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "cleanedId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoRestore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonVisit_userId_openedAt_idx" ON "PersonVisit"("userId", "openedAt");
CREATE INDEX "PersonVisit_familyId_idx" ON "PersonVisit"("familyId");
CREATE INDEX "PhotoRestore_familyId_idx" ON "PhotoRestore"("familyId");

-- AddForeignKey
ALTER TABLE "PersonVisit" ADD CONSTRAINT "PersonVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonVisit" ADD CONSTRAINT "PersonVisit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonVisit" ADD CONSTRAINT "PersonVisit_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhotoRestore" ADD CONSTRAINT "PhotoRestore_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhotoRestore" ADD CONSTRAINT "PhotoRestore_originalId_fkey" FOREIGN KEY ("originalId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhotoRestore" ADD CONSTRAINT "PhotoRestore_cleanedId_fkey" FOREIGN KEY ("cleanedId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
