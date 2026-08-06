/*
  Warnings:

  - You are about to drop the column `m1MAttendanceId` on the `m1m_sectors` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "m1m_sectors" DROP CONSTRAINT "m1m_sectors_m1MAttendanceId_fkey";

-- AlterTable
ALTER TABLE "m1m_sectors" DROP COLUMN "m1MAttendanceId";

-- AddForeignKey
ALTER TABLE "m1m_attendances" ADD CONSTRAINT "m1m_attendances_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "m1m_sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
