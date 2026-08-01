-- CreateTable
CREATE TABLE "m1m_sectors" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "m1MAttendanceId" TEXT,

    CONSTRAINT "m1m_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "m1m_sectors_companyId_idx" ON "m1m_sectors"("companyId");

-- CreateIndex
CREATE INDEX "m1m_sectors_companyId_active_idx" ON "m1m_sectors"("companyId", "active");

-- CreateIndex
CREATE INDEX "m1m_sectors_companyId_sortOrder_idx" ON "m1m_sectors"("companyId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_sectors_companyId_name_key" ON "m1m_sectors"("companyId", "name");

-- AddForeignKey
ALTER TABLE "m1m_sectors" ADD CONSTRAINT "m1m_sectors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_sectors" ADD CONSTRAINT "m1m_sectors_m1MAttendanceId_fkey" FOREIGN KEY ("m1MAttendanceId") REFERENCES "m1m_attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
