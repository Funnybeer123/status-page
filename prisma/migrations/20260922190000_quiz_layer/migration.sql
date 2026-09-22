-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "placeId" TEXT;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "personId" TEXT;

-- AlterTable
ALTER TABLE "Citation" ADD COLUMN "kind" TEXT;

-- CreateIndex
CREATE INDEX "Asset_placeId_idx" ON "Asset"("placeId");

-- CreateIndex
CREATE INDEX "Comment_personId_idx" ON "Comment"("personId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
