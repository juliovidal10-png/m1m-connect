// TF3-A: teste estrutural sem banco e sem acesso a empresas reais.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20261026180000_tf3a_conversation_states/migration.sql");
const service = read("src/services/conversation-unread-state.service.ts");
const sync = read("src/services/conversation-sync.service.ts");
const readRoute = read("src/app/api/chat/read/route.ts");

assert.match(schema, /model M1MConversationState/);
assert.match(schema, /model M1MConversationUnreadMessage/);
assert.match(schema, /@@unique\(\[companyId, instanceName, evolutionMessageId\]\)/);
assert.match(migration, /CREATE UNIQUE INDEX "m1m_conversation_unread_messages_companyId_instanceName_evolutionMessageId_key"/);
assert.match(service, /skipDuplicates: true/);
assert.match(service, /isolationLevel: "Serializable"/);
assert.match(service, /retrySerialization/);
assert.match(service, /confirmedEvolutionMessageIds/);
assert.match(service, /hiddenAt: now/);
assert.match(sync, /M1M_TF3A_UNREAD_LEDGER_ENABLED === "true"/);
assert.match(sync, /canonicalJid: canonicalCustomerRemoteJid/);
assert.match(sync, /!message\.fromMe && message\.direction === M1MMessageDirection\.IN/);
assert.match(readRoute, /persistLedgerRead/);
assert.match(readRoute, /recordConfirmedRead/);
assert.match(readRoute, /M1M_TF3A_UNREAD_LEDGER_ENABLED !== "true"/);
assert.match(readRoute, /states.length !== 1/);
console.log("TF3-A: verificacoes estruturais aprovadas. Nao substituem testes de integracao.");
