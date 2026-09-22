-- AlterTable
ALTER TABLE "Person" ADD COLUMN "lastSeenOn" DATE;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "takenById" TEXT;

-- AlterTable
ALTER TABLE "SchoolClass" ADD COLUMN "teacherId" TEXT;

-- CreateTable
CREATE TABLE "FuneralPallbearer" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "deceasedId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "FuneralPallbearer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChristeningGown" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChristeningGown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChristeningGownWear" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "gownId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "wornOn" DATE,
    "notes" TEXT,

    CONSTRAINT "ChristeningGownWear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IceHarvestCrew" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "place" TEXT,
    "role" TEXT,
    "notes" TEXT,

    CONSTRAINT "IceHarvestCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurnameSpelling" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "SurnameSpelling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreshingRing" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "place" TEXT,
    "role" TEXT,
    "notes" TEXT,

    CONSTRAINT "ThreshingRing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyVehicle" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "FamilyVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyLine" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PartyLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyLinePerson" (
    "lineId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "PartyLinePerson_pkey" PRIMARY KEY ("lineId","personId")
);

-- CreateTable
CREATE TABLE "MilkRoute" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "notes" TEXT,

    CONSTRAINT "MilkRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilkRouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "stopOrder" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "MilkRouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchPew" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "church" TEXT NOT NULL,
    "pewNumber" TEXT NOT NULL,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "ChurchPew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraveBlanket" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "placedById" TEXT,
    "monthDay" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "GraveBlanket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrainElevatorAccount" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "elevator" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "year" INTEGER,
    "notes" TEXT,

    CONSTRAINT "GrainElevatorAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FuneralPallbearer_deceasedId_personId_key" ON "FuneralPallbearer"("deceasedId", "personId");
CREATE INDEX "FuneralPallbearer_familyId_idx" ON "FuneralPallbearer"("familyId");
CREATE INDEX "ChristeningGown_familyId_idx" ON "ChristeningGown"("familyId");
CREATE INDEX "ChristeningGownWear_familyId_gownId_idx" ON "ChristeningGownWear"("familyId", "gownId");
CREATE INDEX "IceHarvestCrew_familyId_year_idx" ON "IceHarvestCrew"("familyId", "year");
CREATE INDEX "SurnameSpelling_familyId_surname_idx" ON "SurnameSpelling"("familyId", "surname");
CREATE INDEX "ThreshingRing_familyId_year_idx" ON "ThreshingRing"("familyId", "year");
CREATE INDEX "FamilyVehicle_familyId_idx" ON "FamilyVehicle"("familyId");
CREATE INDEX "PartyLine_familyId_idx" ON "PartyLine"("familyId");
CREATE INDEX "MilkRoute_familyId_idx" ON "MilkRoute"("familyId");
CREATE INDEX "MilkRouteStop_routeId_stopOrder_idx" ON "MilkRouteStop"("routeId", "stopOrder");
CREATE INDEX "ChurchPew_familyId_idx" ON "ChurchPew"("familyId");
CREATE INDEX "GraveBlanket_familyId_idx" ON "GraveBlanket"("familyId");
CREATE INDEX "GrainElevatorAccount_familyId_idx" ON "GrainElevatorAccount"("familyId");
CREATE INDEX "Asset_takenById_idx" ON "Asset"("takenById");
CREATE INDEX "SchoolClass_teacherId_idx" ON "SchoolClass"("teacherId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FuneralPallbearer" ADD CONSTRAINT "FuneralPallbearer_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FuneralPallbearer" ADD CONSTRAINT "FuneralPallbearer_deceasedId_fkey" FOREIGN KEY ("deceasedId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FuneralPallbearer" ADD CONSTRAINT "FuneralPallbearer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChristeningGown" ADD CONSTRAINT "ChristeningGown_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChristeningGownWear" ADD CONSTRAINT "ChristeningGownWear_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChristeningGownWear" ADD CONSTRAINT "ChristeningGownWear_gownId_fkey" FOREIGN KEY ("gownId") REFERENCES "ChristeningGown"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChristeningGownWear" ADD CONSTRAINT "ChristeningGownWear_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IceHarvestCrew" ADD CONSTRAINT "IceHarvestCrew_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IceHarvestCrew" ADD CONSTRAINT "IceHarvestCrew_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurnameSpelling" ADD CONSTRAINT "SurnameSpelling_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreshingRing" ADD CONSTRAINT "ThreshingRing_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreshingRing" ADD CONSTRAINT "ThreshingRing_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyVehicle" ADD CONSTRAINT "FamilyVehicle_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyVehicle" ADD CONSTRAINT "FamilyVehicle_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartyLine" ADD CONSTRAINT "PartyLine_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartyLinePerson" ADD CONSTRAINT "PartyLinePerson_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "PartyLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartyLinePerson" ADD CONSTRAINT "PartyLinePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MilkRoute" ADD CONSTRAINT "MilkRoute_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MilkRouteStop" ADD CONSTRAINT "MilkRouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "MilkRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MilkRouteStop" ADD CONSTRAINT "MilkRouteStop_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchPew" ADD CONSTRAINT "ChurchPew_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchPew" ADD CONSTRAINT "ChurchPew_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GraveBlanket" ADD CONSTRAINT "GraveBlanket_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GraveBlanket" ADD CONSTRAINT "GraveBlanket_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GraveBlanket" ADD CONSTRAINT "GraveBlanket_placedById_fkey" FOREIGN KEY ("placedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GrainElevatorAccount" ADD CONSTRAINT "GrainElevatorAccount_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrainElevatorAccount" ADD CONSTRAINT "GrainElevatorAccount_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
