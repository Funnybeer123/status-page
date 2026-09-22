-- AlterEnum
ALTER TYPE "EventKind" ADD VALUE 'baptism';

-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('exact', 'circa', 'before', 'after');

-- AlterTable
ALTER TABLE "Person" ADD COLUMN "causeOfDeath" TEXT;
ALTER TABLE "Person" ADD COLUMN "languages" TEXT;
ALTER TABLE "Person" ADD COLUMN "burialPlot" TEXT;

-- AlterTable
ALTER TABLE "LifeEvent" ADD COLUMN "precision" "DatePrecision" NOT NULL DEFAULT 'exact';

-- CreateTable
CREATE TABLE "EventWitness" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "EventWitness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventWitness_eventId_personId_key" ON "EventWitness"("eventId", "personId");

-- CreateIndex
CREATE INDEX "EventWitness_familyId_idx" ON "EventWitness"("familyId");

-- AddForeignKey
ALTER TABLE "EventWitness" ADD CONSTRAINT "EventWitness_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWitness" ADD CONSTRAINT "EventWitness_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LifeEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWitness" ADD CONSTRAINT "EventWitness_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
