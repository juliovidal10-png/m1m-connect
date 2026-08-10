/*
  Warnings:

  - A unique constraint covering the columns `[companyId,customerCode]` on the table `m1m_customers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "m1m_customers_companyId_customerCode_key" ON "m1m_customers"("companyId", "customerCode");
