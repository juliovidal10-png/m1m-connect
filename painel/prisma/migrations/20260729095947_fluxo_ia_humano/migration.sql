-- AlterTable
ALTER TABLE "m1m_customers" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "responsibleId" TEXT;

-- CreateIndex
CREATE INDEX "m1m_customers_responsibleId_idx" ON "m1m_customers"("responsibleId");

-- CreateIndex
CREATE INDEX "m1m_customers_status_idx" ON "m1m_customers"("status");

-- AddForeignKey
ALTER TABLE "m1m_customers" ADD CONSTRAINT "m1m_customers_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "m1m_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
