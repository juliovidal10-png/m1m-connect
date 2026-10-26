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
