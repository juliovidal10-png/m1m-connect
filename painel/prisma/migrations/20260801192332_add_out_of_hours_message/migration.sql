-- AlterTable
ALTER TABLE "m1m_companies" ADD COLUMN     "outOfHoursMessage" TEXT;

-- AlterTable
ALTER TABLE "m1m_sectors" ADD COLUMN     "outOfHoursMessage" TEXT,
ADD COLUMN     "useCustomOutOfHoursMessage" BOOLEAN NOT NULL DEFAULT false;
