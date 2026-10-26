-- TF3-A: estrutura aditiva. Nenhum dado historico e apagado ou recalculado.
-- Aplicacao em producao somente apos validacao e autorizacao separadas.
CREATE TABLE "m1m_conversation_states" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "instanceName" TEXT NOT NULL,
  "canonicalJid" TEXT NOT NULL,
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  "lastIncomingMessageId" TEXT,
  "lastIncomingAt" TIMESTAMP(3),
  "lastReadMessageId" TEXT,
  "lastReadAt" TIMESTAMP(3),
  "hiddenAt" TIMESTAMP(3),
  "hiddenThroughMessageId" TEXT,
  "hiddenThroughAt" TIMESTAMP(3),
  "revision" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "m1m_conversation_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "m1m_conversation_states_unreadCount_check" CHECK ("unreadCount" >= 0)
);
CREATE UNIQUE INDEX "m1m_conversation_states_companyId_instanceName_canonicalJid_key" ON "m1m_conversation_states"("companyId","instanceName","canonicalJid");
CREATE INDEX "m1m_conversation_states_companyId_instanceName_unreadCount_idx" ON "m1m_conversation_states"("companyId","instanceName","unreadCount");
CREATE INDEX "m1m_conversation_states_companyId_instanceName_hiddenAt_idx" ON "m1m_conversation_states"("companyId","instanceName","hiddenAt");
ALTER TABLE "m1m_conversation_states" ADD CONSTRAINT "m1m_conversation_states_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ledger de mensagens recebidas, idempotente por empresa, instancia e ID Evolution.
CREATE TABLE "m1m_conversation_unread_messages" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "instanceName" TEXT NOT NULL,
  "evolutionMessageId" TEXT NOT NULL,
  "conversationStateId" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "m1m_conversation_unread_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "m1m_conversation_unread_messages_companyId_instanceName_evolutionMessageId_key" ON "m1m_conversation_unread_messages"("companyId","instanceName","evolutionMessageId");
CREATE INDEX "m1m_conversation_unread_messages_conversationStateId_readAt_idx" ON "m1m_conversation_unread_messages"("conversationStateId","readAt");
CREATE INDEX "m1m_conversation_unread_messages_companyId_instanceName_readAt_idx" ON "m1m_conversation_unread_messages"("companyId","instanceName","readAt");
ALTER TABLE "m1m_conversation_unread_messages" ADD CONSTRAINT "m1m_conversation_unread_messages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "m1m_conversation_unread_messages" ADD CONSTRAINT "m1m_conversation_unread_messages_conversationStateId_fkey" FOREIGN KEY ("conversationStateId") REFERENCES "m1m_conversation_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
