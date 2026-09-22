-- CreateTable
CREATE TABLE "FenceViewer" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "neighbors" TEXT NOT NULL,
    "walkedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "FenceViewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadTax" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "road" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "year" INTEGER,
    "notes" TEXT,

    CONSTRAINT "RoadTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreameryCheck" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "paidOn" DATE,
    "pounds" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CreameryCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LightningRod" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "year" INTEGER,
    "notes" TEXT,

    CONSTRAINT "LightningRod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapleCamp" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "gallons" TEXT NOT NULL,
    "year" INTEGER,
    "place" TEXT,
    "notes" TEXT,

    CONSTRAINT "MapleCamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuskingBee" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "heldOn" DATE,
    "place" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HuskingBee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuskingBeeGuest" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "beeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "HuskingBeeGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MidwifeRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "midwifeId" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "childId" TEXT,
    "attendedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "MidwifeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeadstoneCarver" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "carverId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "yard" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "HeadstoneCarver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charivari" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heldOn" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Charivari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharivariGuest" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "charivariId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "noise" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CharivariGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CattleBrand" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "mark" TEXT NOT NULL,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "CattleBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SorghumBoil" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "gallons" TEXT NOT NULL,
    "year" INTEGER,
    "place" TEXT,
    "notes" TEXT,

    CONSTRAINT "SorghumBoil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SickWatch" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "sickId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "satOn" DATE,
    "notes" TEXT,

    CONSTRAINT "SickWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolBoardTerm" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "office" TEXT NOT NULL,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "SchoolBoardTerm_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FenceViewer_familyId_idx" ON "FenceViewer"("familyId");
CREATE INDEX "RoadTax_familyId_year_idx" ON "RoadTax"("familyId", "year");
CREATE INDEX "CreameryCheck_familyId_idx" ON "CreameryCheck"("familyId");
CREATE INDEX "LightningRod_familyId_idx" ON "LightningRod"("familyId");
CREATE INDEX "MapleCamp_familyId_year_idx" ON "MapleCamp"("familyId", "year");
CREATE INDEX "HuskingBee_familyId_idx" ON "HuskingBee"("familyId");
CREATE UNIQUE INDEX "HuskingBeeGuest_beeId_personId_key" ON "HuskingBeeGuest"("beeId", "personId");
CREATE INDEX "HuskingBeeGuest_familyId_beeId_idx" ON "HuskingBeeGuest"("familyId", "beeId");
CREATE INDEX "MidwifeRecord_familyId_idx" ON "MidwifeRecord"("familyId");
CREATE INDEX "HeadstoneCarver_familyId_idx" ON "HeadstoneCarver"("familyId");
CREATE INDEX "Charivari_familyId_idx" ON "Charivari"("familyId");
CREATE UNIQUE INDEX "CharivariGuest_charivariId_personId_key" ON "CharivariGuest"("charivariId", "personId");
CREATE INDEX "CharivariGuest_familyId_charivariId_idx" ON "CharivariGuest"("familyId", "charivariId");
CREATE INDEX "CattleBrand_familyId_idx" ON "CattleBrand"("familyId");
CREATE INDEX "SorghumBoil_familyId_year_idx" ON "SorghumBoil"("familyId", "year");
CREATE UNIQUE INDEX "SickWatch_sickId_personId_key" ON "SickWatch"("sickId", "personId");
CREATE INDEX "SickWatch_familyId_idx" ON "SickWatch"("familyId");
CREATE INDEX "SchoolBoardTerm_familyId_idx" ON "SchoolBoardTerm"("familyId");

ALTER TABLE "FenceViewer" ADD CONSTRAINT "FenceViewer_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FenceViewer" ADD CONSTRAINT "FenceViewer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoadTax" ADD CONSTRAINT "RoadTax_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoadTax" ADD CONSTRAINT "RoadTax_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreameryCheck" ADD CONSTRAINT "CreameryCheck_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreameryCheck" ADD CONSTRAINT "CreameryCheck_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LightningRod" ADD CONSTRAINT "LightningRod_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LightningRod" ADD CONSTRAINT "LightningRod_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MapleCamp" ADD CONSTRAINT "MapleCamp_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MapleCamp" ADD CONSTRAINT "MapleCamp_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HuskingBee" ADD CONSTRAINT "HuskingBee_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HuskingBee" ADD CONSTRAINT "HuskingBee_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HuskingBeeGuest" ADD CONSTRAINT "HuskingBeeGuest_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HuskingBeeGuest" ADD CONSTRAINT "HuskingBeeGuest_beeId_fkey" FOREIGN KEY ("beeId") REFERENCES "HuskingBee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HuskingBeeGuest" ADD CONSTRAINT "HuskingBeeGuest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MidwifeRecord" ADD CONSTRAINT "MidwifeRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MidwifeRecord" ADD CONSTRAINT "MidwifeRecord_midwifeId_fkey" FOREIGN KEY ("midwifeId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MidwifeRecord" ADD CONSTRAINT "MidwifeRecord_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MidwifeRecord" ADD CONSTRAINT "MidwifeRecord_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HeadstoneCarver" ADD CONSTRAINT "HeadstoneCarver_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HeadstoneCarver" ADD CONSTRAINT "HeadstoneCarver_carverId_fkey" FOREIGN KEY ("carverId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HeadstoneCarver" ADD CONSTRAINT "HeadstoneCarver_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Charivari" ADD CONSTRAINT "Charivari_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharivariGuest" ADD CONSTRAINT "CharivariGuest_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharivariGuest" ADD CONSTRAINT "CharivariGuest_charivariId_fkey" FOREIGN KEY ("charivariId") REFERENCES "Charivari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharivariGuest" ADD CONSTRAINT "CharivariGuest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CattleBrand" ADD CONSTRAINT "CattleBrand_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CattleBrand" ADD CONSTRAINT "CattleBrand_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SorghumBoil" ADD CONSTRAINT "SorghumBoil_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SorghumBoil" ADD CONSTRAINT "SorghumBoil_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SickWatch" ADD CONSTRAINT "SickWatch_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SickWatch" ADD CONSTRAINT "SickWatch_sickId_fkey" FOREIGN KEY ("sickId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SickWatch" ADD CONSTRAINT "SickWatch_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolBoardTerm" ADD CONSTRAINT "SchoolBoardTerm_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolBoardTerm" ADD CONSTRAINT "SchoolBoardTerm_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
