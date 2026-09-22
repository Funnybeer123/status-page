-- AlterTable
ALTER TABLE "PhotoPair" ADD COLUMN "placeId" TEXT;
ALTER TABLE "Document" ADD COLUMN "postmarkedAt" DATE;
ALTER TABLE "Document" ADD COLUMN "stampText" TEXT;

-- CreateTable
CREATE TABLE "FamilyPhoneContact" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "callOrder" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyPhoneContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeGuestBook" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeGuestBook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhotoPair_placeId_idx" ON "PhotoPair"("placeId");
CREATE INDEX "FamilyPhoneContact_familyId_callOrder_idx" ON "FamilyPhoneContact"("familyId", "callOrder");
CREATE INDEX "HomeGuestBook_familyId_createdAt_idx" ON "HomeGuestBook"("familyId", "createdAt");

-- AddForeignKey
ALTER TABLE "PhotoPair" ADD CONSTRAINT "PhotoPair_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FamilyPhoneContact" ADD CONSTRAINT "FamilyPhoneContact_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyPhoneContact" ADD CONSTRAINT "FamilyPhoneContact_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeGuestBook" ADD CONSTRAINT "HomeGuestBook_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeGuestBook" ADD CONSTRAINT "HomeGuestBook_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
