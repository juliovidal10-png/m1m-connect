-- CreateEnum
CREATE TYPE "M1MMessageDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "M1MMessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'CONTACT', 'STICKER', 'REACTION', 'UNKNOWN');

-- CreateTable
CREATE TABLE "m1m_messages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "instanceName" TEXT NOT NULL,
    "evolutionMessageId" TEXT NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "direction" "M1MMessageDirection" NOT NULL,
    "type" "M1MMessageType" NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "mimeType" TEXT,
    "rawPayload" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "m1m_messages_companyId_idx" ON "m1m_messages"("companyId");

-- CreateIndex
CREATE INDEX "m1m_messages_customerId_idx" ON "m1m_messages"("customerId");

-- CreateIndex
CREATE INDEX "m1m_messages_attendanceId_idx" ON "m1m_messages"("attendanceId");

-- CreateIndex
CREATE INDEX "m1m_messages_remoteJid_idx" ON "m1m_messages"("remoteJid");

-- CreateIndex
CREATE INDEX "m1m_messages_direction_idx" ON "m1m_messages"("direction");

-- CreateIndex
CREATE INDEX "m1m_messages_type_idx" ON "m1m_messages"("type");

-- CreateIndex
CREATE INDEX "m1m_messages_sentAt_idx" ON "m1m_messages"("sentAt");

-- CreateIndex
CREATE INDEX "m1m_messages_processedAt_idx" ON "m1m_messages"("processedAt");

-- CreateIndex
CREATE INDEX "m1m_messages_companyId_remoteJid_sentAt_idx" ON "m1m_messages"("companyId", "remoteJid", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_messages_companyId_instanceName_evolutionMessageId_key" ON "m1m_messages"("companyId", "instanceName", "evolutionMessageId");

-- AddForeignKey
ALTER TABLE "m1m_messages" ADD CONSTRAINT "m1m_messages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_messages" ADD CONSTRAINT "m1m_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "m1m_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_messages" ADD CONSTRAINT "m1m_messages_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "m1m_attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
