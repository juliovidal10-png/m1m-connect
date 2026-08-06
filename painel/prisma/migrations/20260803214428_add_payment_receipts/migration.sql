-- CreateEnum
CREATE TYPE "M1MPaymentReceiptStatus" AS ENUM ('RECEIVED', 'CLASSIFIED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'AWAITING_NEW_RECEIPT', 'CUSTOMER_NOTIFIED', 'FINISHED');

-- CreateEnum
CREATE TYPE "M1MPaymentReceiptEventType" AS ENUM ('RECEIVED', 'CLASSIFIED', 'REVIEW_STARTED', 'APPROVED', 'REJECTED', 'AWAITING_NEW_RECEIPT', 'CUSTOMER_NOTIFIED', 'FINISHED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "m1m_payment_receipts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "messageId" TEXT,
    "responsibleId" TEXT,
    "status" "M1MPaymentReceiptStatus" NOT NULL DEFAULT 'RECEIVED',
    "mediaUrl" TEXT,
    "mimeType" TEXT,
    "fileName" TEXT,
    "amount" DECIMAL(14,2),
    "paymentMethod" TEXT,
    "identifiedBank" TEXT,
    "paidAt" TIMESTAMP(3),
    "observations" TEXT,
    "rejectionReason" TEXT,
    "classifiedAt" TIMESTAMP(3),
    "reviewStartedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "customerNotifiedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_payment_receipt_events" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "type" "M1MPaymentReceiptEventType" NOT NULL,
    "actorType" "M1MAttendanceActorType" NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m1m_payment_receipt_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "m1m_payment_receipts_messageId_key" ON "m1m_payment_receipts"("messageId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_companyId_idx" ON "m1m_payment_receipts"("companyId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_customerId_idx" ON "m1m_payment_receipts"("customerId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_attendanceId_idx" ON "m1m_payment_receipts"("attendanceId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_responsibleId_idx" ON "m1m_payment_receipts"("responsibleId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_status_idx" ON "m1m_payment_receipts"("status");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_createdAt_idx" ON "m1m_payment_receipts"("createdAt");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_companyId_status_idx" ON "m1m_payment_receipts"("companyId", "status");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_companyId_customerId_idx" ON "m1m_payment_receipts"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipt_events_receiptId_idx" ON "m1m_payment_receipt_events"("receiptId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipt_events_type_idx" ON "m1m_payment_receipt_events"("type");

-- CreateIndex
CREATE INDEX "m1m_payment_receipt_events_actorId_idx" ON "m1m_payment_receipt_events"("actorId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipt_events_createdAt_idx" ON "m1m_payment_receipt_events"("createdAt");

-- AddForeignKey
ALTER TABLE "m1m_payment_receipts" ADD CONSTRAINT "m1m_payment_receipts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipts" ADD CONSTRAINT "m1m_payment_receipts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "m1m_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipts" ADD CONSTRAINT "m1m_payment_receipts_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "m1m_attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipts" ADD CONSTRAINT "m1m_payment_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "m1m_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipts" ADD CONSTRAINT "m1m_payment_receipts_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "m1m_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipt_events" ADD CONSTRAINT "m1m_payment_receipt_events_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "m1m_payment_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipt_events" ADD CONSTRAINT "m1m_payment_receipt_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "m1m_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
