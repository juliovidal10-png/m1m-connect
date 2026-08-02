-- AlterTable
ALTER TABLE "m1m_sectors" ADD COLUMN     "useCustomSchedule" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "m1m_company_schedules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dayOfWeek" "M1MWeekday" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "secondOpeningTime" TEXT,
    "secondClosingTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_company_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "m1m_company_schedules_companyId_idx" ON "m1m_company_schedules"("companyId");

-- CreateIndex
CREATE INDEX "m1m_company_schedules_companyId_enabled_idx" ON "m1m_company_schedules"("companyId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_company_schedules_companyId_dayOfWeek_key" ON "m1m_company_schedules"("companyId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "m1m_company_schedules" ADD CONSTRAINT "m1m_company_schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
