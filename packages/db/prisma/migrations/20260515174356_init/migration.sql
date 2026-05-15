-- CreateEnum
CREATE TYPE "TherapistRole" AS ENUM ('OWNER', 'ADMIN', 'THERAPIST');

-- CreateTable
CREATE TABLE "clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapist" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "externalAuthId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "TherapistRole" NOT NULL DEFAULT 'THERAPIST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "externalAuthId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "therapist_externalAuthId_key" ON "therapist"("externalAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "therapist_email_key" ON "therapist"("email");

-- CreateIndex
CREATE INDEX "therapist_clinicId_idx" ON "therapist"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "client_externalAuthId_key" ON "client"("externalAuthId");

-- CreateIndex
CREATE INDEX "client_clinicId_idx" ON "client"("clinicId");

-- CreateIndex
CREATE INDEX "client_therapistId_idx" ON "client"("therapistId");

-- CreateIndex
CREATE UNIQUE INDEX "client_clinicId_email_key" ON "client"("clinicId", "email");

-- AddForeignKey
ALTER TABLE "therapist" ADD CONSTRAINT "therapist_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
