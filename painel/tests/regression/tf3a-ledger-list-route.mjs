import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { unreadSnapshots } from './load-unread-snapshot.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const routeCode = compile('src/app/api/chat/list/route.ts');
const projectionCode = compile('src/services/conversation-unread-projection.service.ts');
async function scenario({ query = 'limit=1', enabled = true, restricted = false } = {}) {
  const raw = [...Array.from({ length: 60 }, (_, i) => ({ remoteJid: `${1000 + i}@s.whatsapp.net`, pushName: 'target hidden', updatedAt: '2026-01-01T00:00:00Z', unreadCount: 99 })), ...['2000', '3000'].map(id => ({ remoteJid: id + '@s.whatsapp.net', pushName: 'target visible', updatedAt: '2026-01-01T00:00:00Z', unreadCount: 99 }))];
  const customers = [raw[0], raw[60], raw[61]].map((r, i) => ({ id: 'customer-' + i, remoteJid: r.remoteJid, name: r.pushName, companyId: 'company-test' }));
  const states = raw.slice(0, 60).map(r => ({ canonicalJid: r.remoteJid, unreadCount: 0, revision: 2, hiddenAt: new Date() }));
  states.push({ canonicalJid: raw[60].remoteJid, unreadCount: 0, revision: 3, hiddenAt: null });
  const queries = [], network = [];
  const prisma = {
    m1MCustomer: { async findMany({ where }) { assert.equal(where.companyId, 'company-test'); return customers; } },
    m1MAttendance: { async findMany({ where }) { assert.equal(where.companyId, 'company-test'); return restricted ? customers.map((c, i) => ({ customerId: c.id, id: 'attendance-' + i, state: 'HUMANO', sectorId: i === 2 ? 'other-sector' : 'allowed-sector', responsibleId: null })) : []; } },
    m1MSectorUser: { async findMany() { return [{ sectorId: 'allowed-sector' }]; } },
    m1MConversationState: { async findMany(q) { assert.equal(q.where.companyId, 'company-test'); assert.equal(q.where.instanceName, 'instance-test'); queries.push(q.where.canonicalJid.in); return states.filter(s => q.where.canonicalJid.in.includes(s.canonicalJid)); } },
  };
  prisma.$queryRawUnsafe = async (sql, companyId, instanceName, canViewAll, userId, sectorIds, ids) => {
    assert.equal(companyId, 'company-test');assert.equal(instanceName,'instance-test');queries.push(ids);
    return ids.filter(id=>canViewAll||['1000@s.whatsapp.net','2000@s.whatsapp.net'].includes(id)).map(id=>{
      const state=states.find(s=>s.canonicalJid===id);
      return {canonicalJid:id,unreadCount:state?.unreadCount??null,revision:state?.revision??null,hiddenAt:state?.hiddenAt??null};
    });
  };
  const projection = { exports: {} };
  vm.runInNewContext(compile('src/services/conversation-ledger-access.service.ts'), {module:projection,exports:projection.exports,require(name){
    if(name==='node:crypto')return require(name);
    if(name==='@/lib/prisma')return {prisma};
    if(name==='@/lib/conversation-unread-snapshot')return unreadSnapshots;
    if(name==='@/repositories/company.repository')return {companyRepository:{findById:async()=>({whatsappInstanceName:'instance-test'})}};
    throw Error(name);
  }});
  const module = { exports: {} };
  vm.runInNewContext(routeCode, { module, exports: module.exports, URL,
    process: { env: { EVOLUTION_API_URL: 'https://synthetic.invalid', EVOLUTION_API_KEY: 'synthetic', M1M_TF3A_UNREAD_LEDGER_ENABLED: enabled ? 'true' : 'false' } },
    console: { log() {}, info() {}, warn() {}, error() {} },
    async fetch(url, options) {
      assert.equal(url, 'https://synthetic.invalid/chat/findChats/instance-test');
      const body = JSON.parse(options.body); network.push(body);
      const chats = body.where?.remoteJid ? raw.filter(r => r.remoteJid === body.where.remoteJid) : raw.slice(body.skip ?? 0, (body.skip ?? 0) + (body.take ?? 200));
      return { ok: true, async json() { return chats; } };
    },
    require(name) {
      if (name === 'node:crypto') return require(name);
      if (name === '@/lib/conversation-unread-snapshot') return unreadSnapshots;
      if (name === '@/services/conversation-ledger-access.service') return projection.exports;
      if (name === '@/services/conversation-unread-state.service') return { countUnreadConversations() { throw Error('Agregado inesperado'); } };
      if (name === '@/lib/prisma') return { prisma };
      if (name === '@/lib/tenant') return {};
      if (name === '@/generated/prisma/enums') return { M1MUserPermission: { VIEW_ALL_CONVERSATIONS: 'ALL' } };
      if (name === '@/services/auth/authorization.service') return { authorizationService: { async getCurrentUser() { return { companyId: 'company-test', userId: 'user-test' }; }, hasPermission() { return !restricted; } } };
      if (name === '@/repositories/company.repository') return { companyRepository: { async findById(id) { assert.equal(id, 'company-test'); return { name: 'synthetic', whatsappInstanceName: 'instance-test' }; } } };
      if (name === 'next/server') return { NextResponse: { json(body, options) { return { body, status: options?.status ?? 200 }; } } };
      throw Error(name);
    },
  });
  return { response: await module.exports.GET({ url: 'https://synthetic.invalid/api/chat/list?' + query, signal: { aborted: false } }), queries, network };
}
const first = await scenario(); assert.equal(first.response.status, 200); assert.equal(first.response.body.items.length, 1);
assert.equal(first.response.body.items[0].remoteJid, '2000@s.whatsapp.net'); assert.equal(first.response.body.items[0].unreadCount, 0); assert.equal(first.response.body.hasMore, true);
assert.equal(first.network.length, 2);
console.log('PASSOU: pagina inicial percorre lote oculto e preserva hasMore.');
const second = await scenario({ query: 'limit=1&offset=1' }); assert.equal(second.response.status, 200);
assert.equal(second.response.body.items[0].remoteJid, '3000@s.whatsapp.net'); assert.equal(second.response.body.items[0].unreadCount, null); assert.equal(second.response.body.items[0].unreadSource, 'PENDING'); assert.equal(second.response.body.hasMore, false);
console.log('PASSOU: pagina seguinte mantem item sem ledger como pendente, sem inventar zero.');
const search = await scenario({ query: 'search=target' }); assert.equal(search.response.status, 200); assert.equal(search.response.body.items.length, 2); assert.ok(search.response.body.items.every(r => !r.remoteJid.startsWith('1')));
console.log('PASSOU: busca direta tambem filtra ocultas e usa a mesma projecao.');
const restricted = await scenario({ restricted: true }); assert.equal(restricted.response.status, 200); assert.equal(restricted.response.body.items.length, 1);
assert.ok(restricted.response.body.items.every(chat=>chat.remoteJid==='2000@s.whatsapp.net'));
console.log('PASSOU: visibilidade por setor do servico compartilhado e aplicada antes de responder.');
const legacy = await scenario({ enabled: false }); assert.equal(legacy.response.status, 200); assert.equal(legacy.queries.length, 0); assert.equal(legacy.response.body.items[0].unreadCount, 99);
console.log('PASSOU: flag desligada nao consulta ledger nem altera badge legado.');
console.log('TF3-A: cinco cenarios da rota com projecao real e persistencia/Evolution simuladas.');

