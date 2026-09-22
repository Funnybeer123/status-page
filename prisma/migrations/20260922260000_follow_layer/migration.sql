-- AlterTable
ALTER TABLE "Invite" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'member';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "keepOutOfAsk" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Story" ADD COLUMN "keepOutOfAsk" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN "keepOutOfAsk" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ShareLink" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PersonBookmark" (
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonBookmark_pkey" PRIMARY KEY ("userId","personId")
);

-- CreateTable
CREATE TABLE "PersonFollow" (
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonFollow_pkey" PRIMARY KEY ("userId","personId")
);

-- CreateTable
CREATE TABLE "ShareLinkOpen" (
    "id" TEXT NOT NULL,
    "shareLinkId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "userId" TEXT,

    CONSTRAINT "ShareLinkOpen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonBookmark_personId_idx" ON "PersonBookmark"("personId");
CREATE INDEX "PersonFollow_personId_idx" ON "PersonFollow"("personId");
CREATE INDEX "ShareLinkOpen_shareLinkId_openedAt_idx" ON "ShareLinkOpen"("shareLinkId", "openedAt");

-- AddForeignKey
ALTER TABLE "PersonBookmark" ADD CONSTRAINT "PersonBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonBookmark" ADD CONSTRAINT "PersonBookmark_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonFollow" ADD CONSTRAINT "PersonFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonFollow" ADD CONSTRAINT "PersonFollow_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShareLinkOpen" ADD CONSTRAINT "ShareLinkOpen_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShareLinkOpen" ADD CONSTRAINT "ShareLinkOpen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
