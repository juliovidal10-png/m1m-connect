import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/app/api/chat/list/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
async function scenario({ enabled = true, allowed = true, company = { whatsappInstanceName: ' instance-test ' }, count = 4, fail = false, query = 'totalCount=1' } = {}) {
  const calls = []; const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, URL,
    process: { env: { M1M_TF3A_UNREAD_LEDGER_ENABLED: enabled ? 'true' : 'false' } },
    console: { log() {}, error() {}, warn() {} },
    fetch() { throw Error('Inventario Evolution nao deve ser consultado'); },
    require(name) {
      if (name === 'node:crypto') return require(name);
      if (name === 'next/server') return { NextResponse: { json(body, options) { return { body, status: options?.status ?? 200, headers: options?.headers }; } } };
      if (name === '@/services/auth/authorization.service') return { authorizationService: {
        async getCurrentUser() { return { companyId: 'authenticated-company', userId: 'user-test' }; },
        hasPermission(_user, permission) { assert.equal(permission, 'VIEW_ALL'); return allowed; },
      } };
      if (name === '@/generated/prisma/enums') return { M1MUserPermission: { VIEW_ALL_CONVERSATIONS: 'VIEW_ALL' } };
      if (name === '@/repositories/company.repository') return { companyRepository: { async findById(id) { assert.equal(id, 'authenticated-company'); return company; } } };
      if (name === '@/services/conversation-unread-state.service') return { async countUnreadConversations(companyId, instance) { calls.push({ companyId, instance }); if (fail) throw Error('DB unavailable'); return count; } };
      if (name === '@/lib/prisma') return { prisma: new Proxy({}, { get() { throw Error('Consulta de inventario/permissoes inesperada'); } }) };
      if (name === '@/lib/tenant') return { getAuthenticatedCompanyId() { throw Error('Caminho inesperado'); } };
      throw Error('Import inesperado: ' + name);
    },
  });
  return { response: await mod.exports.GET({ url: 'https://synthetic.invalid/api/chat/list?' + query }), calls };
}
for (const count of [0, 1, 4, 410]) {
  const { response, calls } = await scenario({ count, query: 'totalCount=1&companyId=other&instance=other&offset=999&limit=1&search=none' });
  assert.equal(response.status, 200); assert.equal(response.body.totalCount, count);
  assert.equal(response.body.countKind, 'unreadConversations'); assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.stringify(calls), JSON.stringify([{ companyId: 'authenticated-company', instance: 'instance-test' }]));
  console.log('PASSOU: agregado autenticado independente de paginacao e parametros externos: ' + count);
}
const denied = await scenario({ allowed: false });
assert.equal(denied.response.status, 403); assert.equal(denied.calls.length, 0);
console.log('PASSOU: usuario restrito nao recebe agregado global nem zero inventado.');
for (const [company, status] of [[null, 404], [{ whatsappInstanceName: ' ' }, 503]]) {
  const r = await scenario({ company }); assert.equal(r.response.status, status); assert.equal(r.calls.length, 0);
  console.log('PASSOU: empresa/instancia indisponivel nao produz contagem.');
}
for (const count of [-1, 0.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
  const r = await scenario({ count }); assert.equal(r.response.status, 500); assert.equal(r.response.body.totalCount, undefined);
  console.log('PASSOU: agregado invalido nao vira indicador.');
}
const failed = await scenario({ fail: true }); assert.equal(failed.response.status, 500); assert.equal(failed.response.body.totalCount, undefined);
console.log('PASSOU: falha no banco nao retorna zero.');
for (const options of [{ enabled: false }, { query: 'waitingCount=1' }]) {
  const r = await scenario(options); assert.equal(r.response.status, 500); assert.equal(r.calls.length, 0);
  console.log('PASSOU: flag desligada/fila Aguardando preservam caminho legado sem ledger.');
}
console.log('TF3-A: 14 cenarios do indicador lateral com dependencias simuladas; sem banco/Evolution reais.');
