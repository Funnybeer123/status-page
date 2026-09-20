CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "Role" AS ENUM ('owner', 'contributor', 'viewer');
CREATE TYPE "RelType" AS ENUM ('parent', 'partner');
CREATE TYPE "AssetKind" AS ENUM ('photo', 'video', 'letter');
CREATE TYPE "DocKind" AS ENUM ('letter', 'note');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'contributor',
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'contributor',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "givenName" TEXT,
    "familyName" TEXT,
    "birthDate" DATE,
    "deathDate" DATE,
    "notes" TEXT,
    "profileAssetId" TEXT,
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "fromPersonId" TEXT NOT NULL,
    "toPersonId" TEXT NOT NULL,
    "type" "RelType" NOT NULL,
    "startedAt" DATE,
    "endedAt" DATE,
    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "title" TEXT,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonTag" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    CONSTRAINT "PersonTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "assetId" TEXT,
    "title" TEXT NOT NULL,
    "kind" "DocKind" NOT NULL,
    "transcript" TEXT NOT NULL,
    "writtenAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentPerson" (
    "documentId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    CONSTRAINT "DocumentPerson_pkey" PRIMARY KEY ("documentId","personId")
);

CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "personId" TEXT,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Family_slug_key" ON "Family"("slug");
CREATE UNIQUE INDEX "Membership_userId_familyId_key" ON "Membership"("userId", "familyId");
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
CREATE UNIQUE INDEX "Document_assetId_key" ON "Document"("assetId");
CREATE UNIQUE INDEX "PersonTag_assetId_personId_key" ON "PersonTag"("assetId", "personId");
CREATE INDEX "Relationship_familyId_type_idx" ON "Relationship"("familyId", "type");
CREATE INDEX "Chunk_familyId_idx" ON "Chunk"("familyId");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Person" ADD CONSTRAINT "Person_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_fromPersonId_fkey" FOREIGN KEY ("fromPersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_toPersonId_fkey" FOREIGN KEY ("toPersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonTag" ADD CONSTRAINT "PersonTag_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonTag" ADD CONSTRAINT "PersonTag_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentPerson" ADD CONSTRAINT "DocumentPerson_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentPerson" ADD CONSTRAINT "DocumentPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
