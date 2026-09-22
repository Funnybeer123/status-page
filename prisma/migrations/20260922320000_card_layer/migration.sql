-- AlterTable
ALTER TABLE "User" ADD COLUMN "quietMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Document" ADD COLUMN "fragileOriginal" BOOLEAN NOT NULL DEFAULT false;
