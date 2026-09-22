-- CreateTable
CREATE TABLE "QuiltingBee" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heldOn" DATE,
    "place" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuiltingBee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuiltingBeeBlock" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "beeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "QuiltingBeeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchBell" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "rangOn" DATE,
    "notes" TEXT,

    CONSTRAINT "ChurchBell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoxSocial" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "heldOn" DATE,
    "price" TEXT,
    "notes" TEXT,

    CONSTRAINT "BoxSocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuralMailRoute" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "carrierId" TEXT,
    "name" TEXT NOT NULL,
    "days" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "RuralMailRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuralMailBox" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "boxNumber" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "RuralMailBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WashDay" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "weekday" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "WashDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeedOrder" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "year" INTEGER,
    "notes" TEXT,

    CONSTRAINT "SeedOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarnRaising" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heldOn" DATE,
    "place" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarnRaising_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarnRaisingCrew" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "raisingId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "BarnRaisingCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmationClass" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "church" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfirmationClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmationPupil" (
    "classId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "ConfirmationPupil_pkey" PRIMARY KEY ("classId","personId")
);

-- CreateTable
CREATE TABLE "Deathwatch" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "deceasedId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "watchedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "Deathwatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ButterEggAccount" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "year" INTEGER,
    "notes" TEXT,

    CONSTRAINT "ButterEggAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "depth" TEXT NOT NULL,
    "year" INTEGER,
    "notes" TEXT,

    CONSTRAINT "WellRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParlorOrgan" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "place" TEXT,
    "notes" TEXT,

    CONSTRAINT "ParlorOrgan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SundaySchoolPin" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "church" TEXT,
    "notes" TEXT,

    CONSTRAINT "SundaySchoolPin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuiltingBeeBlock_beeId_personId_key" ON "QuiltingBeeBlock"("beeId", "personId");
CREATE INDEX "QuiltingBee_familyId_idx" ON "QuiltingBee"("familyId");
CREATE INDEX "QuiltingBeeBlock_familyId_beeId_idx" ON "QuiltingBeeBlock"("familyId", "beeId");
CREATE INDEX "ChurchBell_familyId_idx" ON "ChurchBell"("familyId");
CREATE INDEX "BoxSocial_familyId_idx" ON "BoxSocial"("familyId");
CREATE INDEX "RuralMailRoute_familyId_idx" ON "RuralMailRoute"("familyId");
CREATE INDEX "RuralMailBox_routeId_boxNumber_idx" ON "RuralMailBox"("routeId", "boxNumber");
CREATE INDEX "WashDay_familyId_idx" ON "WashDay"("familyId");
CREATE INDEX "SeedOrder_familyId_year_idx" ON "SeedOrder"("familyId", "year");
CREATE INDEX "BarnRaising_familyId_idx" ON "BarnRaising"("familyId");
CREATE UNIQUE INDEX "BarnRaisingCrew_raisingId_personId_key" ON "BarnRaisingCrew"("raisingId", "personId");
CREATE INDEX "BarnRaisingCrew_familyId_raisingId_idx" ON "BarnRaisingCrew"("familyId", "raisingId");
CREATE INDEX "ConfirmationClass_familyId_year_idx" ON "ConfirmationClass"("familyId", "year");
CREATE UNIQUE INDEX "Deathwatch_deceasedId_personId_key" ON "Deathwatch"("deceasedId", "personId");
CREATE INDEX "Deathwatch_familyId_idx" ON "Deathwatch"("familyId");
CREATE INDEX "ButterEggAccount_familyId_idx" ON "ButterEggAccount"("familyId");
CREATE INDEX "WellRecord_familyId_idx" ON "WellRecord"("familyId");
CREATE INDEX "ParlorOrgan_familyId_idx" ON "ParlorOrgan"("familyId");
CREATE INDEX "SundaySchoolPin_familyId_year_idx" ON "SundaySchoolPin"("familyId", "year");

ALTER TABLE "QuiltingBee" ADD CONSTRAINT "QuiltingBee_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuiltingBeeBlock" ADD CONSTRAINT "QuiltingBeeBlock_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuiltingBeeBlock" ADD CONSTRAINT "QuiltingBeeBlock_beeId_fkey" FOREIGN KEY ("beeId") REFERENCES "QuiltingBee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuiltingBeeBlock" ADD CONSTRAINT "QuiltingBeeBlock_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchBell" ADD CONSTRAINT "ChurchBell_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchBell" ADD CONSTRAINT "ChurchBell_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoxSocial" ADD CONSTRAINT "BoxSocial_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoxSocial" ADD CONSTRAINT "BoxSocial_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoxSocial" ADD CONSTRAINT "BoxSocial_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RuralMailRoute" ADD CONSTRAINT "RuralMailRoute_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RuralMailRoute" ADD CONSTRAINT "RuralMailRoute_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RuralMailBox" ADD CONSTRAINT "RuralMailBox_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "RuralMailRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RuralMailBox" ADD CONSTRAINT "RuralMailBox_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WashDay" ADD CONSTRAINT "WashDay_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WashDay" ADD CONSTRAINT "WashDay_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeedOrder" ADD CONSTRAINT "SeedOrder_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeedOrder" ADD CONSTRAINT "SeedOrder_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BarnRaising" ADD CONSTRAINT "BarnRaising_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BarnRaisingCrew" ADD CONSTRAINT "BarnRaisingCrew_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BarnRaisingCrew" ADD CONSTRAINT "BarnRaisingCrew_raisingId_fkey" FOREIGN KEY ("raisingId") REFERENCES "BarnRaising"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BarnRaisingCrew" ADD CONSTRAINT "BarnRaisingCrew_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfirmationClass" ADD CONSTRAINT "ConfirmationClass_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfirmationPupil" ADD CONSTRAINT "ConfirmationPupil_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ConfirmationClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfirmationPupil" ADD CONSTRAINT "ConfirmationPupil_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deathwatch" ADD CONSTRAINT "Deathwatch_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deathwatch" ADD CONSTRAINT "Deathwatch_deceasedId_fkey" FOREIGN KEY ("deceasedId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deathwatch" ADD CONSTRAINT "Deathwatch_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ButterEggAccount" ADD CONSTRAINT "ButterEggAccount_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ButterEggAccount" ADD CONSTRAINT "ButterEggAccount_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WellRecord" ADD CONSTRAINT "WellRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WellRecord" ADD CONSTRAINT "WellRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParlorOrgan" ADD CONSTRAINT "ParlorOrgan_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParlorOrgan" ADD CONSTRAINT "ParlorOrgan_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SundaySchoolPin" ADD CONSTRAINT "SundaySchoolPin_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SundaySchoolPin" ADD CONSTRAINT "SundaySchoolPin_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
