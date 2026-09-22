-- CreateTable
CREATE TABLE "ShellingBee" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "heldOn" DATE,
    "place" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShellingBee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShellingBeeGuest" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "beeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ShellingBeeGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorseTeam" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "loanedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "HorseTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmokehouseItem" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "hungOn" DATE,
    "notes" TEXT,

    CONSTRAINT "SmokehouseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceAssessment" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "loss" TEXT NOT NULL,
    "assessedOn" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceMember" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "paid" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "InsuranceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycloneCellar" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "storm" TEXT NOT NULL,
    "heldOn" DATE,
    "place" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycloneCellar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycloneCellarGuest" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "cellarId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CycloneCellarGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CakeCutter" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "cutterId" TEXT NOT NULL,
    "couple" TEXT NOT NULL,
    "wedding" TEXT NOT NULL,
    "cutOn" DATE,
    "notes" TEXT,

    CONSTRAINT "CakeCutter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadDistrict" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "RoadDistrict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ButcheringCrew" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heldOn" DATE,
    "place" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ButcheringCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ButcheringWorker" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ButcheringWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChristmasPart" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "piece" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "heldOn" DATE,
    "place" TEXT,
    "notes" TEXT,

    CONSTRAINT "ChristmasPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeddlerVisit" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "peddler" TEXT NOT NULL,
    "goods" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "visitedOn" DATE,
    "notes" TEXT,

    CONSTRAINT "PeddlerVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrayNotice" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "animal" TEXT NOT NULL,
    "postedOn" DATE,
    "place" TEXT,
    "notes" TEXT,

    CONSTRAINT "StrayNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineShowBuy" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "show" TEXT NOT NULL,
    "boughtOn" DATE,
    "notes" TEXT,

    CONSTRAINT "MedicineShowBuy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ButterMold" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "mark" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ButterMold_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShellingBee_familyId_idx" ON "ShellingBee"("familyId");
CREATE UNIQUE INDEX "ShellingBeeGuest_beeId_personId_key" ON "ShellingBeeGuest"("beeId", "personId");
CREATE INDEX "ShellingBeeGuest_familyId_beeId_idx" ON "ShellingBeeGuest"("familyId", "beeId");
CREATE INDEX "HorseTeam_familyId_idx" ON "HorseTeam"("familyId");
CREATE INDEX "SmokehouseItem_familyId_idx" ON "SmokehouseItem"("familyId");
CREATE INDEX "InsuranceAssessment_familyId_idx" ON "InsuranceAssessment"("familyId");
CREATE UNIQUE INDEX "InsuranceMember_assessmentId_personId_key" ON "InsuranceMember"("assessmentId", "personId");
CREATE INDEX "InsuranceMember_familyId_assessmentId_idx" ON "InsuranceMember"("familyId", "assessmentId");
CREATE INDEX "CycloneCellar_familyId_idx" ON "CycloneCellar"("familyId");
CREATE UNIQUE INDEX "CycloneCellarGuest_cellarId_personId_key" ON "CycloneCellarGuest"("cellarId", "personId");
CREATE INDEX "CycloneCellarGuest_familyId_cellarId_idx" ON "CycloneCellarGuest"("familyId", "cellarId");
CREATE INDEX "CakeCutter_familyId_idx" ON "CakeCutter"("familyId");
CREATE INDEX "RoadDistrict_familyId_idx" ON "RoadDistrict"("familyId");
CREATE INDEX "ButcheringCrew_familyId_idx" ON "ButcheringCrew"("familyId");
CREATE UNIQUE INDEX "ButcheringWorker_crewId_personId_key" ON "ButcheringWorker"("crewId", "personId");
CREATE INDEX "ButcheringWorker_familyId_crewId_idx" ON "ButcheringWorker"("familyId", "crewId");
CREATE INDEX "ChristmasPart_familyId_idx" ON "ChristmasPart"("familyId");
CREATE INDEX "PeddlerVisit_familyId_idx" ON "PeddlerVisit"("familyId");
CREATE INDEX "StrayNotice_familyId_idx" ON "StrayNotice"("familyId");
CREATE INDEX "MedicineShowBuy_familyId_idx" ON "MedicineShowBuy"("familyId");
CREATE INDEX "ButterMold_familyId_idx" ON "ButterMold"("familyId");

ALTER TABLE "ShellingBee" ADD CONSTRAINT "ShellingBee_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShellingBee" ADD CONSTRAINT "ShellingBee_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShellingBeeGuest" ADD CONSTRAINT "ShellingBeeGuest_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShellingBeeGuest" ADD CONSTRAINT "ShellingBeeGuest_beeId_fkey" FOREIGN KEY ("beeId") REFERENCES "ShellingBee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShellingBeeGuest" ADD CONSTRAINT "ShellingBeeGuest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HorseTeam" ADD CONSTRAINT "HorseTeam_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HorseTeam" ADD CONSTRAINT "HorseTeam_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HorseTeam" ADD CONSTRAINT "HorseTeam_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SmokehouseItem" ADD CONSTRAINT "SmokehouseItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SmokehouseItem" ADD CONSTRAINT "SmokehouseItem_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceAssessment" ADD CONSTRAINT "InsuranceAssessment_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceMember" ADD CONSTRAINT "InsuranceMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceMember" ADD CONSTRAINT "InsuranceMember_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "InsuranceAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceMember" ADD CONSTRAINT "InsuranceMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CycloneCellar" ADD CONSTRAINT "CycloneCellar_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CycloneCellarGuest" ADD CONSTRAINT "CycloneCellarGuest_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CycloneCellarGuest" ADD CONSTRAINT "CycloneCellarGuest_cellarId_fkey" FOREIGN KEY ("cellarId") REFERENCES "CycloneCellar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CycloneCellarGuest" ADD CONSTRAINT "CycloneCellarGuest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CakeCutter" ADD CONSTRAINT "CakeCutter_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CakeCutter" ADD CONSTRAINT "CakeCutter_cutterId_fkey" FOREIGN KEY ("cutterId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoadDistrict" ADD CONSTRAINT "RoadDistrict_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoadDistrict" ADD CONSTRAINT "RoadDistrict_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ButcheringCrew" ADD CONSTRAINT "ButcheringCrew_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ButcheringWorker" ADD CONSTRAINT "ButcheringWorker_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ButcheringWorker" ADD CONSTRAINT "ButcheringWorker_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "ButcheringCrew"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ButcheringWorker" ADD CONSTRAINT "ButcheringWorker_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChristmasPart" ADD CONSTRAINT "ChristmasPart_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChristmasPart" ADD CONSTRAINT "ChristmasPart_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeddlerVisit" ADD CONSTRAINT "PeddlerVisit_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeddlerVisit" ADD CONSTRAINT "PeddlerVisit_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrayNotice" ADD CONSTRAINT "StrayNotice_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrayNotice" ADD CONSTRAINT "StrayNotice_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicineShowBuy" ADD CONSTRAINT "MedicineShowBuy_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicineShowBuy" ADD CONSTRAINT "MedicineShowBuy_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ButterMold" ADD CONSTRAINT "ButterMold_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ButterMold" ADD CONSTRAINT "ButterMold_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
