-- AlterTable
ALTER TABLE "Person" ADD COLUMN "middleName" TEXT;

-- AlterTable
ALTER TABLE "PersonName" ADD COLUMN "namedById" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "paperMill" TEXT;
ALTER TABLE "Document" ADD COLUMN "heldById" TEXT;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "sitterId" TEXT;

-- CreateTable
CREATE TABLE "LetterMarginNote" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LetterMarginNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WillWitness" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "stoodOn" DATE,
    "notes" TEXT,

    CONSTRAINT "WillWitness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyCrest" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blazon" TEXT NOT NULL,
    "tincture" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyCrest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyPhrase" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "language" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyPhrase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReunionProgramItem" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "reunionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TEXT,
    "personId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReunionProgramItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LetterMarginNote_familyId_documentId_idx" ON "LetterMarginNote"("familyId", "documentId");
CREATE UNIQUE INDEX "WillWitness_documentId_personId_key" ON "WillWitness"("documentId", "personId");
CREATE INDEX "WillWitness_familyId_idx" ON "WillWitness"("familyId");
CREATE INDEX "FamilyCrest_familyId_idx" ON "FamilyCrest"("familyId");
CREATE INDEX "FamilyPhrase_familyId_idx" ON "FamilyPhrase"("familyId");
CREATE INDEX "ReunionProgramItem_familyId_reunionId_idx" ON "ReunionProgramItem"("familyId", "reunionId");
CREATE INDEX "PersonName_namedById_idx" ON "PersonName"("namedById");
CREATE INDEX "Document_heldById_idx" ON "Document"("heldById");
CREATE INDEX "Asset_sitterId_idx" ON "Asset"("sitterId");

-- AddForeignKey
ALTER TABLE "PersonName" ADD CONSTRAINT "PersonName_namedById_fkey" FOREIGN KEY ("namedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_heldById_fkey" FOREIGN KEY ("heldById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_sitterId_fkey" FOREIGN KEY ("sitterId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LetterMarginNote" ADD CONSTRAINT "LetterMarginNote_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LetterMarginNote" ADD CONSTRAINT "LetterMarginNote_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LetterMarginNote" ADD CONSTRAINT "LetterMarginNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WillWitness" ADD CONSTRAINT "WillWitness_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WillWitness" ADD CONSTRAINT "WillWitness_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WillWitness" ADD CONSTRAINT "WillWitness_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyCrest" ADD CONSTRAINT "FamilyCrest_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyPhrase" ADD CONSTRAINT "FamilyPhrase_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionProgramItem" ADD CONSTRAINT "ReunionProgramItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionProgramItem" ADD CONSTRAINT "ReunionProgramItem_reunionId_fkey" FOREIGN KEY ("reunionId") REFERENCES "ReunionGathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReunionProgramItem" ADD CONSTRAINT "ReunionProgramItem_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
