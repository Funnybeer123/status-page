-- AlterEnum
ALTER TYPE "RelType" ADD VALUE 'adoptive';
ALTER TYPE "RelType" ADD VALUE 'step';
ALTER TYPE "EventKind" ADD VALUE 'divorce';
ALTER TYPE "EventKind" ADD VALUE 'separation';

-- CreateEnum
CREATE TYPE "PartnershipEnd" AS ENUM ('divorce', 'separation');

-- CreateEnum
CREATE TYPE "ShareKind" AS ENUM ('memorial', 'album');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "personId" TEXT;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Relationship" ADD COLUMN "endedKind" "PartnershipEnd";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LifeEvent" ADD COLUMN "preferred" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StoryPrompt" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryPromptAnswer" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryPromptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "kind" "ShareKind" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRevision" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedById" TEXT NOT NULL,

    CONSTRAINT "DocumentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryPrompt_familyId_idx" ON "StoryPrompt"("familyId");

-- CreateIndex
CREATE INDEX "StoryPromptAnswer_promptId_idx" ON "StoryPromptAnswer"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "ShareLink_familyId_kind_idx" ON "ShareLink"("familyId", "kind");

-- CreateIndex
CREATE INDEX "DocumentRevision_documentId_editedAt_idx" ON "DocumentRevision"("documentId", "editedAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPrompt" ADD CONSTRAINT "StoryPrompt_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPromptAnswer" ADD CONSTRAINT "StoryPromptAnswer_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "StoryPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPromptAnswer" ADD CONSTRAINT "StoryPromptAnswer_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPromptAnswer" ADD CONSTRAINT "StoryPromptAnswer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
