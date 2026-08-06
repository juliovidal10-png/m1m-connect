-- CreateEnum
CREATE TYPE "M1MMessageFlagType" AS ENUM ('FAVORITE', 'PINNED');

-- CreateTable
CREATE TABLE "m1m_message_flags" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "M1MMessageFlagType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_message_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "m1m_message_flags_companyId_idx" ON "m1m_message_flags"("companyId");

-- CreateIndex
CREATE INDEX "m1m_message_flags_messageId_idx" ON "m1m_message_flags"("messageId");

-- CreateIndex
CREATE INDEX "m1m_message_flags_type_idx" ON "m1m_message_flags"("type");

-- CreateIndex
CREATE INDEX "m1m_message_flags_companyId_type_createdAt_idx" ON "m1m_message_flags"("companyId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_message_flags_companyId_messageId_type_key" ON "m1m_message_flags"("companyId", "messageId", "type");

-- AddForeignKey
ALTER TABLE "m1m_message_flags" ADD CONSTRAINT "m1m_message_flags_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_message_flags" ADD CONSTRAINT "m1m_message_flags_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "m1m_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
