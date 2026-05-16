-- CreateEnum
CREATE TYPE "Side" AS ENUM ('LEFT', 'RIGHT', 'CENTER');

-- CreateEnum
CREATE TYPE "PainType" AS ENUM ('BURNING', 'SHARP', 'RADIATING', 'DULL', 'ACHING', 'TINGLING');

-- CreateTable
CREATE TABLE "body_region" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "side" "Side",
    "displayLayer" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "body_region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mood" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_in_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pain_point" (
    "id" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "bodyRegionId" TEXT NOT NULL,
    "painType" "PainType" NOT NULL,
    "level" INTEGER NOT NULL,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pain_point_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_region_parentId_idx" ON "body_region"("parentId");

-- CreateIndex
CREATE INDEX "body_region_displayLayer_idx" ON "body_region"("displayLayer");

-- CreateIndex
CREATE INDEX "check_in_clientId_occurredAt_idx" ON "check_in"("clientId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "check_in_clinicId_occurredAt_idx" ON "check_in"("clinicId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "pain_point_checkInId_idx" ON "pain_point"("checkInId");

-- CreateIndex
CREATE INDEX "pain_point_bodyRegionId_idx" ON "pain_point"("bodyRegionId");

-- AddForeignKey
ALTER TABLE "body_region" ADD CONSTRAINT "body_region_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "body_region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pain_point" ADD CONSTRAINT "pain_point_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_in"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pain_point" ADD CONSTRAINT "pain_point_bodyRegionId_fkey" FOREIGN KEY ("bodyRegionId") REFERENCES "body_region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
