-- CreateEnum
CREATE TYPE "M1MWeekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "m1m_sector_schedules" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "dayOfWeek" "M1MWeekday" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "secondOpeningTime" TEXT,
    "secondClosingTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_sector_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "m1m_sector_schedules_sectorId_idx" ON "m1m_sector_schedules"("sectorId");

-- CreateIndex
CREATE INDEX "m1m_sector_schedules_sectorId_enabled_idx" ON "m1m_sector_schedules"("sectorId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_sector_schedules_sectorId_dayOfWeek_key" ON "m1m_sector_schedules"("sectorId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "m1m_sector_schedules" ADD CONSTRAINT "m1m_sector_schedules_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "m1m_sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
