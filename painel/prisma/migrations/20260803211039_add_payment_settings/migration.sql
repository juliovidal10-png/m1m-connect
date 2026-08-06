-- CreateTable
CREATE TABLE "m1m_payment_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "acceptsPix" BOOLEAN NOT NULL DEFAULT false,
    "acceptsCash" BOOLEAN NOT NULL DEFAULT false,
    "acceptsCreditCard" BOOLEAN NOT NULL DEFAULT false,
    "acceptsDebitCard" BOOLEAN NOT NULL DEFAULT false,
    "acceptsBankSlip" BOOLEAN NOT NULL DEFAULT false,
    "acceptsBankTransfer" BOOLEAN NOT NULL DEFAULT false,
    "pixKeyType" TEXT,
    "pixKey" TEXT,
    "pixHolderName" TEXT,
    "pixHolderDocument" TEXT,
    "bankName" TEXT,
    "bankAgency" TEXT,
    "bankAccount" TEXT,
    "bankAccountType" TEXT,
    "maxInstallments" INTEGER,
    "installmentInterest" TEXT,
    "paymentDeadline" TEXT,
    "receiptInstructions" TEXT,
    "billingRules" TEXT,
    "additionalInformation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "m1m_payment_settings_companyId_key" ON "m1m_payment_settings"("companyId");

-- CreateIndex
CREATE INDEX "m1m_payment_settings_companyId_idx" ON "m1m_payment_settings"("companyId");

-- AddForeignKey
ALTER TABLE "m1m_payment_settings" ADD CONSTRAINT "m1m_payment_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
