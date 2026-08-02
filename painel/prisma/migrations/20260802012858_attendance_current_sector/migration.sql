-- AlterTable
ALTER TABLE "m1m_attendances" ADD COLUMN     "sectorId" TEXT;

-- CreateIndex
CREATE INDEX "m1m_attendances_sectorId_idx" ON "m1m_attendances"("sectorId");
