-- CreateEnum
CREATE TYPE "M1MSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "M1MBillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "M1MSubscriptionEventType" AS ENUM ('ACTIVATION', 'RENEWAL');

-- CreateEnum
CREATE TYPE "M1MMessageAuthorType" AS ENUM ('CUSTOMER', 'HUMAN', 'AI');

-- AlterTable
ALTER TABLE "m1m_companies" ADD COLUMN     "accessEndsAt" TIMESTAMP(3),
ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "billingCycle" "M1MBillingCycle",
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planName" TEXT,
ADD COLUMN     "subscriptionPriceCents" INTEGER,
ADD COLUMN     "subscriptionStartedAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "M1MSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "whatsappInstanceName" TEXT;

-- AlterTable
ALTER TABLE "m1m_messages" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "authorName" TEXT,
ADD COLUMN     "authorType" "M1MMessageAuthorType",
ADD COLUMN     "processingStartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "m1m_users" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "m1m_subscription_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "M1MSubscriptionEventType" NOT NULL,
    "planName" TEXT,
    "amountCents" INTEGER,
    "billingCycle" "M1MBillingCycle",
    "previousAccessEndsAt" TIMESTAMP(3),
    "newAccessEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m1m_subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_subscription_payments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "subscriptionEventId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m1m_subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "m1m_subscription_events_companyId_createdAt_idx" ON "m1m_subscription_events"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "m1m_subscription_payments_companyId_paidAt_idx" ON "m1m_subscription_payments"("companyId", "paidAt");

-- CreateIndex
CREATE INDEX "m1m_subscription_payments_subscriptionEventId_idx" ON "m1m_subscription_payments"("subscriptionEventId");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_companies_whatsappInstanceName_key" ON "m1m_companies"("whatsappInstanceName");

-- CreateIndex
CREATE INDEX "m1m_messages_authorType_idx" ON "m1m_messages"("authorType");

-- CreateIndex
CREATE INDEX "m1m_messages_authorId_idx" ON "m1m_messages"("authorId");

-- CreateIndex
CREATE INDEX "m1m_messages_processingStartedAt_idx" ON "m1m_messages"("processingStartedAt");

-- AddForeignKey
ALTER TABLE "m1m_subscription_events" ADD CONSTRAINT "m1m_subscription_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_subscription_payments" ADD CONSTRAINT "m1m_subscription_payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_subscription_payments" ADD CONSTRAINT "m1m_subscription_payments_subscriptionEventId_fkey" FOREIGN KEY ("subscriptionEventId") REFERENCES "m1m_subscription_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
