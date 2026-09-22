-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "weather" TEXT;
ALTER TABLE "Asset" ADD COLUMN "borrowedFromAlbumId" TEXT;
ALTER TABLE "Document" ADD COLUMN "weather" TEXT;
ALTER TABLE "Document" ADD COLUMN "secretUntil" DATE;
ALTER TABLE "Document" ADD COLUMN "ocrConfidence" INTEGER;
ALTER TABLE "JournalEntry" ADD COLUMN "secretUntil" DATE;
ALTER TABLE "FamilyBranch" ADD COLUMN "color" TEXT;

-- CreateTable
CREATE TABLE "FilmCaption" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "oralAssetId" TEXT,
    "seconds" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmCaption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asset_borrowedFromAlbumId_idx" ON "Asset"("borrowedFromAlbumId");
CREATE INDEX "FilmCaption_familyId_filmId_idx" ON "FilmCaption"("familyId", "filmId");
CREATE INDEX "Document_secretUntil_idx" ON "Document"("secretUntil");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_borrowedFromAlbumId_fkey" FOREIGN KEY ("borrowedFromAlbumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FilmCaption" ADD CONSTRAINT "FilmCaption_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilmCaption" ADD CONSTRAINT "FilmCaption_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilmCaption" ADD CONSTRAINT "FilmCaption_oralAssetId_fkey" FOREIGN KEY ("oralAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
