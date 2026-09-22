-- AlterTable
ALTER TABLE "Document" ADD COLUMN "translation" TEXT;
ALTER TABLE "Document" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Document" ADD COLUMN "replyToId" TEXT;

-- CreateTable
CREATE TABLE "AskConversation" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AskConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AskTurn" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sourcesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AskTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustodyRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "documentId" TEXT,
    "assetId" TEXT,
    "notes" TEXT,
    "sinceOn" DATE,

    CONSTRAINT "CustodyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyBusiness" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "place" TEXT,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "FamilyBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyBusinessPerson" (
    "businessId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "FamilyBusinessPerson_pkey" PRIMARY KEY ("businessId","personId")
);

-- CreateTable
CREATE TABLE "AwardRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "awardedOn" DATE,
    "place" TEXT,
    "notes" TEXT,

    CONSTRAINT "AwardRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMembership" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "club" TEXT NOT NULL,
    "place" TEXT,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "ClubMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProbateRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "happenedOn" DATE,
    "place" TEXT,
    "notes" TEXT,

    CONSTRAINT "ProbateRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NaturalizationRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "court" TEXT NOT NULL,
    "place" TEXT,
    "happenedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "NaturalizationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyAddress" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT,
    "label" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "locality" TEXT,
    "region" TEXT,
    "country" TEXT,
    "startedOn" DATE,
    "endedOn" DATE,

    CONSTRAINT "FamilyAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apprenticeship" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "master" TEXT,
    "place" TEXT,
    "startedOn" DATE,
    "endedOn" DATE,

    CONSTRAINT "Apprenticeship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewspaperMention" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "paper" TEXT,
    "publishedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "NewspaperMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AskConversation_familyId_userId_updatedAt_idx" ON "AskConversation"("familyId", "userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AskTurn_conversationId_createdAt_idx" ON "AskTurn"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "CustodyRecord_familyId_idx" ON "CustodyRecord"("familyId");

-- CreateIndex
CREATE INDEX "FamilyBusiness_familyId_idx" ON "FamilyBusiness"("familyId");

-- CreateIndex
CREATE INDEX "AwardRecord_familyId_personId_idx" ON "AwardRecord"("familyId", "personId");

-- CreateIndex
CREATE INDEX "ClubMembership_familyId_personId_idx" ON "ClubMembership"("familyId", "personId");

-- CreateIndex
CREATE INDEX "ProbateRecord_familyId_personId_idx" ON "ProbateRecord"("familyId", "personId");

-- CreateIndex
CREATE INDEX "NaturalizationRecord_familyId_personId_idx" ON "NaturalizationRecord"("familyId", "personId");

-- CreateIndex
CREATE INDEX "FamilyAddress_familyId_idx" ON "FamilyAddress"("familyId");

-- CreateIndex
CREATE INDEX "Apprenticeship_familyId_personId_idx" ON "Apprenticeship"("familyId", "personId");

-- CreateIndex
CREATE INDEX "NewspaperMention_familyId_personId_idx" ON "NewspaperMention"("familyId", "personId");

-- CreateIndex
CREATE INDEX "Document_replyToId_idx" ON "Document"("replyToId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskConversation" ADD CONSTRAINT "AskConversation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskConversation" ADD CONSTRAINT "AskConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskTurn" ADD CONSTRAINT "AskTurn_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AskConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyRecord" ADD CONSTRAINT "CustodyRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyRecord" ADD CONSTRAINT "CustodyRecord_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyRecord" ADD CONSTRAINT "CustodyRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyRecord" ADD CONSTRAINT "CustodyRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyBusiness" ADD CONSTRAINT "FamilyBusiness_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyBusinessPerson" ADD CONSTRAINT "FamilyBusinessPerson_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "FamilyBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyBusinessPerson" ADD CONSTRAINT "FamilyBusinessPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardRecord" ADD CONSTRAINT "AwardRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardRecord" ADD CONSTRAINT "AwardRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProbateRecord" ADD CONSTRAINT "ProbateRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProbateRecord" ADD CONSTRAINT "ProbateRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NaturalizationRecord" ADD CONSTRAINT "NaturalizationRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NaturalizationRecord" ADD CONSTRAINT "NaturalizationRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyAddress" ADD CONSTRAINT "FamilyAddress_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyAddress" ADD CONSTRAINT "FamilyAddress_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprenticeship" ADD CONSTRAINT "Apprenticeship_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprenticeship" ADD CONSTRAINT "Apprenticeship_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewspaperMention" ADD CONSTRAINT "NewspaperMention_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewspaperMention" ADD CONSTRAINT "NewspaperMention_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "FamilyPet" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "FamilyPet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextileRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "makerId" TEXT,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "madeOn" DATE,
    "notes" TEXT,

    CONSTRAINT "TextileRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DnaNote" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "haplogroup" TEXT,
    "company" TEXT,
    "notes" TEXT,

    CONSTRAINT "DnaNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyPet_familyId_idx" ON "FamilyPet"("familyId");

-- CreateIndex
CREATE INDEX "TextileRecord_familyId_idx" ON "TextileRecord"("familyId");

-- CreateIndex
CREATE INDEX "DnaNote_familyId_personId_idx" ON "DnaNote"("familyId", "personId");

-- AddForeignKey
ALTER TABLE "FamilyPet" ADD CONSTRAINT "FamilyPet_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyPet" ADD CONSTRAINT "FamilyPet_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextileRecord" ADD CONSTRAINT "TextileRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextileRecord" ADD CONSTRAINT "TextileRecord_makerId_fkey" FOREIGN KEY ("makerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnaNote" ADD CONSTRAINT "DnaNote_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DnaNote" ADD CONSTRAINT "DnaNote_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
