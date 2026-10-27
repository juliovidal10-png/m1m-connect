import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('src/app/api/chat/read/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
async function scenario({ enabled = true, ledgerStates = [], stored = [{ customer: { remoteJid: '100@s.whatsapp.net' } }], records, messageKeys, requestedJid = '100@s.whatsapp.net' } = {}) {
  const calls = [];
  const prisma = {
    m1MMessage: { async findMany({ where }) {
      assert.equal(where.companyId, 'synthetic-company');
      assert.equal(where.instanceName, 'synthetic-instance');
      assert.equal(where.fromMe, false); assert.equal(where.direction, 'IN');
      assert.equal(where.customer.companyId, 'synthetic-company');
      assert.equal(JSON.stringify(where.evolutionMessageId.in), JSON.stringify(['read-1']));
      return stored;
    } },
    m1MConversationState: { async findMany({ where }) {
      assert.equal(where.companyId, 'synthetic-company'); assert.equal(where.instanceName, 'synthetic-instance');
      return ledgerStates;
    } },
  };
  const mod = { exports: {} };
  vm.runInNewContext(compiled, { module: mod, exports: mod.exports,
    process: { env: { EVOLUTION_API_URL: 'https://synthetic.invalid', EVOLUTION_API_KEY: 'fake',
      M1M_TF3A_UNREAD_LEDGER_ENABLED: enabled ? 'true' : 'false' } },
    console: { log() {}, error() {}, warn() {} },
    fetch() { throw Error('Nenhuma chamada externa permitida'); },
    require(name) {
      if (name === 'next/server') return { NextResponse: { json(body, options) { return { body, status: options?.status ?? 200 }; } } };
      if (name === '@/lib/prisma') return { prisma };
      if (name === '@/generated/prisma/enums') return { M1MUserPermission: { VIEW_ALL_CONVERSATIONS: 'ALL' } };
      if (name === '@/services/auth/authorization.service') return { authorizationService: {
        async getCurrentUser() { return { companyId: 'synthetic-company', userId: 'synthetic-user' }; }, hasPermission() { return true; },
      } };
      if (name === '@/repositories/company.repository') return { companyRepository: {
        async findById() { return { whatsappInstanceName: 'synthetic-instance' }; },
      } };
      if (name === '@/lib/evolution') return { async getMessages() {
        return records ?? [{ key: { id: 'read-1', remoteJid: '100@s.whatsapp.net', remoteJidAlt: 'alternate@lid', fromMe: false }, status: 'READ' }];
      } };
      if (name === '@/services/conversation-unread-state.service') return {
        async recordConfirmedRead(input) { calls.push(input); },
      };
      throw Error('Import inesperado: ' + name);
    },
  });
  const response = await mod.exports.POST({ async json() { return { remoteJid: requestedJid, messageIds: ['read-1'], ...(messageKeys ? { messageKeys } : {}) }; } });
  return { response, calls };
}
const early = await scenario();
assert.equal(early.response.status, 200); assert.equal(early.calls.length, 1);
assert.equal(early.calls[0].canonicalJid, '100@s.whatsapp.net');
assert.equal(early.calls[0].companyId, 'synthetic-company');
assert.equal(early.calls[0].instanceName, 'synthetic-instance');
assert.equal(JSON.stringify(early.calls[0].confirmedEvolutionMessageIds), JSON.stringify(['read-1']));
console.log('PASSOU: rota encaminha recibo confirmado usando historico antes do primeiro ledger.');
const ambiguous = await scenario({ ledgerStates: [{ canonicalJid: '100@s.whatsapp.net' }, { canonicalJid: 'alternate@lid' }] });
assert.equal(ambiguous.response.status, 500); assert.equal(ambiguous.calls.length, 0);
console.log('PASSOU: identidades persistidas divergentes continuam bloqueadas.');
const disabled = await scenario({ enabled: false });
assert.equal(disabled.response.status, 200); assert.equal(disabled.calls.length, 0);
console.log('PASSOU: flag desligada nao chama reconciliacao do ledger.');
const absent = await scenario({ stored: [] });
assert.equal(absent.response.status, 200); assert.equal(absent.calls.length, 0);
console.log('PASSOU: sem identidade persistida nao inventa estado de conversa.');
const key = { id: 'read-1', remoteJid: '100@s.whatsapp.net', remoteJidAlt: 'alternate@lid', fromMe: false };
for (const statuses of [['READ', 'DELIVERY_ACK'], ['DELIVERY_ACK', 'READ'], ['PLAYED', 'DELIVERY_ACK'], ['DELIVERY_ACK', 'PLAYED']]) {
  const result = await scenario({ records: statuses.map(status => ({ key, status })) });
  assert.equal(result.response.status, 200, 'recibo nao pode regredir: ' + statuses.join(' -> '));
  assert.equal(result.response.body.verifiedPendingCount, 0);
  assert.equal(result.calls.length, 1);
  console.log('PASSOU: duplicatas da mesma identidade preservam leitura: ' + statuses.join(' -> '));
}
const conflict = await scenario({ records: [
  { key, status: 'READ' }, { key: { ...key, remoteJidAlt: 'different@lid' }, status: 'READ' },
] });
assert.equal(conflict.response.status, 409); assert.equal(conflict.calls.length, 0);
console.log('PASSOU: recibo READ nao permite aceitar identidades conflitantes.');
for (const [primaryStatus, alternateStatus] of [['DELIVERY_ACK', 'READ'], ['READ', 'DELIVERY_ACK']]) {
  const result = await scenario({
    messageKeys: [{ id: 'read-1', remoteJid: 'alternate@lid' }],
    records: [{ key, status: primaryStatus }, {
      key: { ...key, remoteJid: 'alternate@lid', remoteJidAlt: '100@s.whatsapp.net' }, status: alternateStatus,
    }],
  });
  assert.equal(result.response.status, 200); assert.equal(result.response.body.verifiedPendingCount, 0);
  assert.equal(result.calls.length, 1);
  console.log('PASSOU: par JID/LID espelhado preserva recibo confirmado: ' + primaryStatus + ' / ' + alternateStatus);
}
for (const timestamp of [1704067200, '1704067200']) {
  const result = await scenario({ stored: [], records: [{ key, status: 'READ', messageTimestamp: timestamp }] });
  assert.equal(result.response.status, 200); assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].canonicalJid, key.remoteJid);
  assert.equal(result.calls[0].confirmedMessages[0].receivedAt.toISOString(), '2024-01-01T00:00:00.000Z');
  console.log('PASSOU: recibo sem historico usa identidade/data comprovadas na origem: ' + typeof timestamp);
}
for (const timestamp of [-1, 'not-a-date']) {
  const result = await scenario({ stored: [], records: [{ key, status: 'READ', messageTimestamp: timestamp }] });
  assert.equal(result.response.status, 200); assert.equal(result.calls.length, 0);
  console.log('PASSOU: sem data valida nao cria entrada antecipada.');
}
const lidOnly = await scenario({ stored: [], requestedJid: 'alternate@lid', records: [{
  key: { id: 'read-1', remoteJid: 'alternate@lid', fromMe: false }, status: 'READ', messageTimestamp: 1704067200,
}] });
assert.equal(lidOnly.response.status, 200); assert.equal(lidOnly.calls.length, 0);
console.log('PASSOU: LID sem vinculo oficial ou identidade local nao e promovido a identidade canonica.');
console.log('TF3-A: dezesseis cenarios da rota aprovados com dependencias simuladas; sem rede ou banco real.');
