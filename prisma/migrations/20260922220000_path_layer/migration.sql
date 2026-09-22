-- AlterTable
ALTER TABLE "VoyagePerson" ADD COLUMN "age" INTEGER;
ALTER TABLE "VoyagePerson" ADD COLUMN "role" TEXT;
ALTER TABLE "VoyagePerson" ADD COLUMN "notes" TEXT;

-- CreateTable
CREATE TABLE "CensusHousehold" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "place" TEXT NOT NULL,
    "street" TEXT,
    "groupKey" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CensusHousehold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CensusHouseholdPerson" (
    "householdId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT,
    "age" INTEGER,
    "occupation" TEXT,
    "notes" TEXT,

    CONSTRAINT "CensusHouseholdPerson_pkey" PRIMARY KEY ("householdId","personId")
);

-- CreateTable
CREATE TABLE "ChurchRegister" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "church" TEXT NOT NULL,
    "place" TEXT,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurchRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchRegisterLine" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "happenedOn" DATE,
    "text" TEXT NOT NULL,
    "personId" TEXT,
    "otherPersonId" TEXT,
    "notes" TEXT,

    CONSTRAINT "ChurchRegisterLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxList" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxListName" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "personId" TEXT,
    "name" TEXT NOT NULL,
    "amount" TEXT,
    "notes" TEXT,

    CONSTRAINT "TaxListName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoNote" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareConsent" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "grantedOn" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CensusHousehold_familyId_groupKey_idx" ON "CensusHousehold"("familyId", "groupKey");
CREATE INDEX "ChurchRegister_familyId_idx" ON "ChurchRegister"("familyId");
CREATE INDEX "ChurchRegisterLine_registerId_idx" ON "ChurchRegisterLine"("registerId");
CREATE INDEX "TaxList_familyId_year_idx" ON "TaxList"("familyId", "year");
CREATE INDEX "TaxListName_listId_idx" ON "TaxListName"("listId");
CREATE INDEX "SavedSearch_familyId_userId_idx" ON "SavedSearch"("familyId", "userId");
CREATE INDEX "PhotoNote_familyId_assetId_idx" ON "PhotoNote"("familyId", "assetId");
CREATE UNIQUE INDEX "ShareConsent_familyId_personId_key" ON "ShareConsent"("familyId", "personId");
CREATE INDEX "ShareConsent_familyId_idx" ON "ShareConsent"("familyId");

-- AddForeignKey
ALTER TABLE "CensusHousehold" ADD CONSTRAINT "CensusHousehold_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CensusHouseholdPerson" ADD CONSTRAINT "CensusHouseholdPerson_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "CensusHousehold"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CensusHouseholdPerson" ADD CONSTRAINT "CensusHouseholdPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchRegister" ADD CONSTRAINT "ChurchRegister_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchRegisterLine" ADD CONSTRAINT "ChurchRegisterLine_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "ChurchRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchRegisterLine" ADD CONSTRAINT "ChurchRegisterLine_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChurchRegisterLine" ADD CONSTRAINT "ChurchRegisterLine_otherPersonId_fkey" FOREIGN KEY ("otherPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxList" ADD CONSTRAINT "TaxList_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxListName" ADD CONSTRAINT "TaxListName_listId_fkey" FOREIGN KEY ("listId") REFERENCES "TaxList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxListName" ADD CONSTRAINT "TaxListName_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhotoNote" ADD CONSTRAINT "PhotoNote_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhotoNote" ADD CONSTRAINT "PhotoNote_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShareConsent" ADD CONSTRAINT "ShareConsent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShareConsent" ADD CONSTRAINT "ShareConsent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
