-- M1M Connect
-- Corrige a unicidade de clientes para o contexto multiempresa.
-- Antes: remoteJid unico globalmente.
-- Depois: remoteJid unico somente dentro da mesma empresa.

DROP INDEX IF EXISTS "m1m_customers_remoteJid_key";

CREATE UNIQUE INDEX "m1m_customers_companyId_remoteJid_key"
ON "m1m_customers"("companyId", "remoteJid");