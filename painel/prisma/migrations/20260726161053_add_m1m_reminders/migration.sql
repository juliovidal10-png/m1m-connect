-- CreateTable
CREATE TABLE "m1m_reminders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "responsible" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "m1m_reminders_companyId_idx" ON "m1m_reminders"("companyId");

-- CreateIndex
CREATE INDEX "m1m_reminders_customerId_idx" ON "m1m_reminders"("customerId");

-- CreateIndex
CREATE INDEX "m1m_reminders_remindAt_idx" ON "m1m_reminders"("remindAt");

-- CreateIndex
CREATE INDEX "m1m_reminders_status_idx" ON "m1m_reminders"("status");

-- AddForeignKey
ALTER TABLE "m1m_reminders" ADD CONSTRAINT "m1m_reminders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_reminders" ADD CONSTRAINT "m1m_reminders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "m1m_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
