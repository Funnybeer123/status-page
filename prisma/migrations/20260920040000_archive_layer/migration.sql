CREATE TYPE "NameKind" AS ENUM ('maiden', 'nickname', 'aka', 'birth');
CREATE TYPE "EventKind" AS ENUM ('birth', 'death', 'marriage', 'residence', 'immigration', 'occupation', 'education', 'military', 'other');
ALTER TYPE "DocKind" ADD VALUE IF NOT EXISTS 'story';

CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locality" TEXT,
    "region" TEXT,
    "country" TEXT,
    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonName" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "kind" "NameKind" NOT NULL,
    "name" TEXT NOT NULL,
    "startedAt" DATE,
    "endedAt" DATE,
    CONSTRAINT "PersonName_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Residence" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "startedAt" DATE,
    "endedAt" DATE,
    "notes" TEXT,
    CONSTRAINT "Residence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifeEvent" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "otherPersonId" TEXT,
    "placeId" TEXT,
    "kind" "EventKind" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "happenedOn" DATE,
    CONSTRAINT "LifeEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recordedAt" DATE,
    "tellerPersonId" TEXT,
    "documentId" TEXT,
    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryPerson" (
    "storyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    CONSTRAINT "StoryPerson_pkey" PRIMARY KEY ("storyId","personId")
);

CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "personId" TEXT,
    "eventId" TEXT,
    "nameId" TEXT,
    "residenceId" TEXT,
    "storyId" TEXT,
    "documentId" TEXT,
    "assetId" TEXT,
    "pageNote" TEXT,
    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Story_documentId_key" ON "Story"("documentId");
CREATE INDEX "Place_familyId_idx" ON "Place"("familyId");
CREATE INDEX "PersonName_familyId_personId_idx" ON "PersonName"("familyId", "personId");
CREATE INDEX "Residence_familyId_personId_idx" ON "Residence"("familyId", "personId");
CREATE INDEX "LifeEvent_familyId_happenedOn_idx" ON "LifeEvent"("familyId", "happenedOn");
CREATE INDEX "Story_familyId_idx" ON "Story"("familyId");
CREATE INDEX "Citation_familyId_idx" ON "Citation"("familyId");

ALTER TABLE "Place" ADD CONSTRAINT "Place_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonName" ADD CONSTRAINT "PersonName_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonName" ADD CONSTRAINT "PersonName_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Residence" ADD CONSTRAINT "Residence_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Residence" ADD CONSTRAINT "Residence_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Residence" ADD CONSTRAINT "Residence_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LifeEvent" ADD CONSTRAINT "LifeEvent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LifeEvent" ADD CONSTRAINT "LifeEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LifeEvent" ADD CONSTRAINT "LifeEvent_otherPersonId_fkey" FOREIGN KEY ("otherPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LifeEvent" ADD CONSTRAINT "LifeEvent_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Story" ADD CONSTRAINT "Story_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Story" ADD CONSTRAINT "Story_tellerPersonId_fkey" FOREIGN KEY ("tellerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Story" ADD CONSTRAINT "Story_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoryPerson" ADD CONSTRAINT "StoryPerson_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryPerson" ADD CONSTRAINT "StoryPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LifeEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_nameId_fkey" FOREIGN KEY ("nameId") REFERENCES "PersonName"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
