-- PROPOSTA PARA REVISAO. NAO EXECUTADA. FORA DE prisma/migrations.
-- Primeira unidade: exclusao individual de conversa e revisao administrativa.
-- Nao contem DELETE, UPDATE de dados existentes ou alteracao de FK existente.
-- Os IDs TEXT sao gerados pela aplicacao. Datas seguem UTC, timestamp(3) do projeto.

ALTER TYPE "M1MUserPermission" ADD VALUE 'DELETE_CONVERSATIONS';
-- Retomada e uma acao administrativa, nao uma abertura feita pela IA.
ALTER TYPE "M1MAttendanceEventType" ADD VALUE 'REOPENED_AFTER_REVIEW';

CREATE TABLE "m1m_conversation_deletions" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "m1m_companies"("id") ON DELETE RESTRICT,
  "instanceName" TEXT NOT NULL CHECK (length(trim("instanceName")) > 0),
  "remoteJid" TEXT NOT NULL CHECK (length(trim("remoteJid")) > 0),
  "aliases" TEXT[] NOT NULL,
  "requestKey" TEXT NOT NULL,
  "actorKind" TEXT NOT NULL CHECK ("actorKind" IN ('COMPANY_USER','PLATFORM_ADMIN')),
  "actorId" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PREVIEW' CHECK (
    "state" IN ('PREVIEW','DELETING','DELETED','RESUMED','CANCELLED','FAILED')
  ),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "previewAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
  "confirmedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  UNIQUE ("companyId", "requestKey"),
  UNIQUE ("id", "companyId", "instanceName"),
  CHECK ("remoteJid" = ANY("aliases")),
  CHECK (cardinality("aliases") > 0),
  CHECK ("state" NOT IN ('DELETING','DELETED','RESUMED','FAILED') OR "confirmedAt" IS NOT NULL)
);
CREATE INDEX "m1m_conversation_deletions_scope_idx"
  ON "m1m_conversation_deletions" ("companyId", "instanceName", "remoteJid", "previewAt" DESC);
CREATE INDEX "m1m_conversation_deletions_aliases_idx"
  ON "m1m_conversation_deletions" USING GIN ("aliases");

-- Manifesto exato da previa. Sem FK para a mensagem, que podera ser excluida.
-- Estado PREVIEW/CANCELLED nao suprime mensagens. Consultar sempre o estado da operacao.
-- A mesma chave pode constar em previas distintas; nao identifica mensagem nova.
CREATE TABLE "m1m_conversation_deletion_message_keys" (
  "deletionId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "instanceName" TEXT NOT NULL,
  "localMessageId" TEXT NOT NULL,
  "expectedUpdatedAt" TIMESTAMP(3) NOT NULL,
  "evolutionMessageId" TEXT NOT NULL,
  PRIMARY KEY ("deletionId", "evolutionMessageId"),
  FOREIGN KEY ("deletionId", "companyId", "instanceName")
    REFERENCES "m1m_conversation_deletions" ("id", "companyId", "instanceName") ON DELETE RESTRICT
);
CREATE INDEX "m1m_conversation_deletion_message_lookup_idx"
  ON "m1m_conversation_deletion_message_keys" ("companyId", "instanceName", "evolutionMessageId");

-- Apenas eventos incertos, nao uma copia do historico excluido.
-- normalizedPayload tem whitelist na aplicacao: texto/tipo/autoria/midia necessarios a revisao.
-- Nunca armazenar envelope bruto, apikey, headers, segredo ou URL contendo autenticacao.
CREATE TABLE "m1m_conversation_deletion_reviews" (
  "id" TEXT PRIMARY KEY,
  -- Nulo somente enquanto identidade nao puder ser vinculada com seguranca.
  "deletionId" TEXT,
  "companyId" TEXT NOT NULL REFERENCES "m1m_companies"("id") ON DELETE RESTRICT,
  "instanceName" TEXT NOT NULL,
  "remoteJid" TEXT NOT NULL,
  "evolutionMessageId" TEXT NOT NULL,
  "reason" TEXT NOT NULL CHECK ("reason" IN ('UNCERTAIN_ORIGIN','UNRESOLVED_IDENTITY')),
  "state" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("state" IN ('PENDING','RESUMED','DISCARDED')),
  "normalizedPayload" JSONB,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "reviewedAt" TIMESTAMP(3),
  "reviewerKind" TEXT CHECK ("reviewerKind" IN ('COMPANY_USER','PLATFORM_ADMIN')),
  "reviewerId" TEXT,
  UNIQUE ("companyId", "instanceName", "evolutionMessageId"),
  FOREIGN KEY ("deletionId", "companyId", "instanceName")
    REFERENCES "m1m_conversation_deletions" ("id", "companyId", "instanceName") ON DELETE RESTRICT,
  CHECK ("deletionId" IS NOT NULL OR "reason" = 'UNRESOLVED_IDENTITY'),
  CHECK (("state" = 'PENDING' AND "normalizedPayload" IS NOT NULL
         AND jsonb_typeof("normalizedPayload") = 'object' AND "reviewedAt" IS NULL)
    OR ("state" <> 'PENDING' AND "normalizedPayload" IS NULL AND "reviewedAt" IS NOT NULL
         AND "reviewerKind" IS NOT NULL AND "reviewerId" IS NOT NULL))
);
CREATE INDEX "m1m_conversation_deletion_reviews_pending_idx"
  ON "m1m_conversation_deletion_reviews" ("companyId", "instanceName", "firstSeenAt", "id")
  WHERE "state" = 'PENDING';

-- ROLLBACK: primeiro parar novas exclusoes/revisoes na aplicacao, sem desativar
-- os filtros e as barreiras de reimportacao. NAO remover estas tabelas se existir
-- uma exclusao confirmada ou evento pendente: isso permitiria restaurar historico.
-- Estruturas vazias podem ser removidas em ordem reviews, message_keys, deletions,
-- apos verificacao administrativa. PostgreSQL nao remove isoladamente um valor de
-- enum: manter DELETE_CONVERSATIONS sem uso no rollback, sem recriar o enum em producao.
-- Mensagens apagadas nao sao recuperadas por rollback de estrutura.
