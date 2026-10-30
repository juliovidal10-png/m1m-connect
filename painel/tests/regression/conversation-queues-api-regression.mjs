// Rota real e NextResponse real. Banco, autenticacao e Evolution sinteticos em memoria.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
let clockOffset = 0;
class TestDate extends Date { static now() { return Date.now() + clockOffset; } }
const root = new URL('../../src/', import.meta.url);
function loadTS(path, modules, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(path, root), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX},
  }).outputText;
  const module = {exports: {}};
  vm.runInNewContext(code, {module, exports: module.exports, require: name => modules[name] ?? require(name), console: {log() {}, warn() {}, error() {}}, URL, Request, Response, AbortController, AbortSignal, Date: TestDate, process: {env: {EVOLUTION_API_URL: 'http://synthetic-evolution', EVOLUTION_API_KEY: 'synthetic-key'}}, ...globals});
  return module.exports;
}
const queues = loadTS('lib/conversation-queue.ts', {});
const state = {company: 'A', admin: true, sectors: ['A'], customers: [], attendances: [], raw: new Map(), calls: [], infinite: false};
let sequence = 0;
function add(kind, {company = 'A', sector = 'A', responsible = null, name = 'Cliente fila', group = false} = {}) {
  const n = ++sequence;
  const jid = group ? `1203${n}@g.us` : `556590${String(n).padStart(6, '0')}@s.whatsapp.net`;
  const customer = {id: `c${n}`, companyId: company, remoteJid: jid, name, status: 'IA', responsibleId: responsible};
  state.customers.push(customer);
  if (kind) state.attendances.push({id: `a${n}`, customerId: customer.id, companyId: company, state: kind, responsibleId: responsible, sectorId: sector, sector: {name: sector}, startedAt: n});
  const raw = {remoteJid: jid, pushName: name, updatedAt: new Date(1800000000000 - n * 1000).toISOString(), unreadCount: 99, lastMessage: {key: {remoteJid: jid}, message: {conversation: name}}};
  const list = state.raw.get(company) ?? []; list.push(raw); state.raw.set(company, list);
  return customer;
}
for (let n = 0; n < 125; n++) add('HUMANO');
for (let n = 0; n < 35; n++) add(n % 2 ? 'IA' : null);
const group = add('IA', {group: true});
const finished = add('FINALIZADO');
const service = add('HUMANO', {responsible: 'user1'});
const otherSector = add('HUMANO', {sector: 'B'});
add('HUMANO', {responsible: 'other-user'});
const otherCompany = add('HUMANO', {company: 'B'});
const modules = {
  '@/lib/conversation-queue': queues,
  '@/generated/prisma/enums': {M1MUserPermission: {VIEW_ALL_CONVERSATIONS: 'VIEW_ALL_CONVERSATIONS'}},
  '@/lib/tenant': {getAuthenticatedCompanyId: async () => state.company},
  '@/services/auth/authorization.service': {authorizationService: {getCurrentUser: async () => ({companyId: state.company, userId: 'user1'}), hasPermission: () => state.admin}},
  '@/repositories/company.repository': {companyRepository: {findById: async id => ({id, name: 'Teste', whatsappInstanceName: `instance-${id}`})}},
  '@/lib/prisma': {prisma: {
    m1MSectorUser: {findMany: async () => state.sectors.map(sectorId => ({sectorId}))},
    m1MCustomer: {findMany: async args => {
      assert.equal(args.include.attendances.take, 1);
      assert.equal(args.include.attendances.where.companyId, args.where.companyId);
      return state.customers.filter(c => c.companyId === args.where.companyId).map(c => ({...c, attendances: state.attendances.filter(a => a.customerId === c.id && a.companyId === c.companyId).sort((a,b) => b.startedAt-a.startedAt).slice(0,1)}));
    }},
    m1MAttendance: {findMany: async args => state.attendances.filter(a => a.companyId === args.where.companyId && args.where.state.in.includes(a.state)).sort((a,b) => b.startedAt-a.startedAt)},
  }},
};
async function fetchEvolution(url, options) {
  const body = options?.body ? JSON.parse(options.body) : {};
  state.calls.push({url, body});
  if (url.includes('/group/')) return Response.json({subject: 'Grupo teste'});
  const company = url.endsWith('instance-B') ? 'B' : 'A';
  assert.ok(url.endsWith(`instance-${company}`));
  let raw = state.raw.get(company) ?? [];
  if (body.where?.remoteJid) raw = raw.filter(c => c.remoteJid === body.where.remoteJid);
  if (state.infinite) return Response.json(Array.from({length: body.take}, (_, n) => ({remoteJid: `${body.skip+n}@s.whatsapp.net`})));
  return Response.json(raw.slice(body.skip ?? 0, (body.skip ?? 0) + (body.take ?? raw.length)));
}
const route = loadTS('app/api/chat/list/route.ts', modules, {fetch: fetchEvolution});
async function get(params) {
  const response = await route.GET(new Request(`http://test/api/chat/list?${params}`));
  return {status: response.status, ...await response.json()};
}
// Lista, abas e alerta simultaneos compartilham a varredura fria.
const cold = await Promise.all([get('queue=OPEN&limit=30'), get('queueCounts=1'), get('waitingCount=1')]);
assert.equal(cold[2].waitingCount, cold[1].waiting);
assert.equal(state.calls.filter(c => c.url.includes('/chat/')).length, 1);
assert.equal(state.calls.filter(c => c.url.includes('/group/')).length, 0);
let result = cold[0];
assert.equal(result.status, 200); assert.equal(result.items.length, 30); assert.equal(result.hasMore, true);
assert.ok(result.items.every(c => queues.getConversationQueue(c) === 'OPEN'));
assert.equal(state.calls.filter(c => c.url.includes('/chat/')).length, 1, 'inventario frio deve ser compartilhado, sem varredura por fila');
result = await get('queue=OPEN&limit=30&offset=30');
assert.equal(result.items.length, 6); assert.equal(result.hasMore, false);
assert.ok(result.items.some(c => c.remoteJid === group.remoteJid));
assert.ok(!result.items.some(c => c.remoteJid === finished.remoteJid));
result = await get('queue=WAITING&search=cliente&offset=100&limit=10');
assert.equal(result.items.length, 10); assert.equal(result.hasMore, true);
assert.ok(result.items.every(c => queues.getConversationQueue(c) === 'WAITING'));
result = await get('queue=IN_SERVICE&limit=999');
assert.equal(result.items.length, 2);
assert.ok(result.items.every(c => queues.getConversationQueue(c) === 'IN_SERVICE'));
assert.equal((await get('queue=unknown')).status, 400);
assert.equal((await get('queue=WAITING&limit=999')).items.length, 100);
const counts = await get('queueCounts=1&queue=OPEN&search=sem-resultado');
assert.equal(counts.waiting, 126); assert.equal(counts.inService, 2);
// Mesma visibilidade de usuario/setor em listas, busca e totais.
state.admin = false;
result = await get('queue=WAITING&limit=100'); assert.equal(result.items.length, 100); assert.equal(result.hasMore, true);
result = await get('queue=WAITING&offset=100&limit=100'); assert.equal(result.items.length, 25);
assert.ok(!result.items.some(c => c.crmCustomerId === otherSector.id));
assert.equal((await get('queue=OPEN')).items.length, 0);
assert.equal((await get('queue=IN_SERVICE')).items.length, 1);
result = await get('queueCounts=1'); assert.equal(result.waiting, 125); assert.equal(result.inService, 1);
assert.equal((await get('waitingCount=1')).waitingCount, 125);
assert.equal((await get('queue=WAITING&search=' + otherSector.remoteJid)).items.length, 0);
state.sectors = []; result = await get('queueCounts=1'); assert.equal(result.waiting, 0); assert.equal(result.inService, 0);
state.sectors = ['A']; state.admin = true;
// Estado persistido confirmado e nova consulta: Assumir, encaminhar, finalizar, reabrir legitimamente.
const open = state.customers.find(c => !state.attendances.some(a => a.customerId === c.id));
const assigned = {id: 'new-assignment', companyId: 'A', customerId: open.id, state: 'HUMANO', responsibleId: 'user1', sectorId: 'A', sector: {name: 'A'}, startedAt: 9999};
state.attendances.push(assigned);
assert.equal((await get('queue=OPEN&search=' + open.remoteJid)).items.length, 0);
assert.equal((await get('queue=IN_SERVICE&search=' + open.remoteJid)).items.length, 1);
assert.equal((await get('waitingCount=1')).waitingCount, 126);
assigned.responsibleId = null; assigned.sectorId = 'B';
assert.equal((await get('waitingCount=1')).waitingCount, 127);
assert.equal((await get('queue=WAITING&search=' + open.remoteJid)).items.length, 1);
assigned.state = 'FINALIZADO';
for (const queue of ['OPEN','WAITING','IN_SERVICE']) assert.equal((await get(`queue=${queue}&search=${open.remoteJid}`)).items.length, 0);
result = await get('search=' + open.remoteJid); assert.equal(result.items[0].attendanceState, 'FINALIZADO', 'acesso direto existente preservado');
state.attendances.push({...assigned, id: 'reopened', state: 'IA', startedAt: 10000});
assert.equal((await get('queue=OPEN&search=' + open.remoteJid)).items.length, 1);
// Cache bruto nao compartilha estado nem permissao entre empresas/instancias.
state.company = 'B'; result = await get('queueCounts=1'); assert.equal(result.waiting, 1); assert.equal(result.inService, 0);
result = await get('queue=WAITING'); assert.equal(result.items[0].crmCustomerId, otherCompany.id);
assert.equal((await get('waitingCount=1')).waitingCount, 1);
state.company = 'A';
// Sem consulta individual por conversa nos novos caminhos de fila/busca.
state.calls = []; await get('queue=OPEN&search=cliente&limit=30');
assert.ok(state.calls.filter(c => c.url.includes('/chat/')).every(c => !c.body.where?.remoteJid));
// Cabeca recente inclui conversa nova sem esperar os 60s do inventario completo.
const beforeNew = await get('queueCounts=1');
const newCustomer = add('HUMANO'); clockOffset += 2100;
const afterNew = await get('queueCounts=1');
assert.equal(afterNew.waiting, beforeNew.waiting + 1);
assert.equal((await get('waitingCount=1')).waitingCount, afterNew.waiting);
// Grupo em Aguardando: contagem dispensa consulta de nome de grupo.
state.attendances.find(a => a.customerId === group.id).state = 'HUMANO';
state.calls = [];
assert.equal((await get('waitingCount=1')).waitingCount, afterNew.waiting + 1);
assert.equal(state.calls.filter(c => c.url.includes('/group/')).length, 0);
assert.equal((await get('queue=WAITING&search=' + newCustomer.remoteJid)).items.length, 1);
// Mais de um lote interno: nao truncar em 1.000 nem alterar a pagina de 100.
for (let n = 0; n < 1000; n++) add('HUMANO');
clockOffset += 61000; state.calls = [];
const many = await get('queueCounts=1');
assert.equal(many.waiting, afterNew.waiting + 1001);
assert.deepEqual(state.calls.map(c => [c.body.take, c.body.skip]), [[1000, 0], [1000, 1000]]);
assert.equal((await get('queue=WAITING&offset=1000&limit=999')).items.length, 100);
// Lote exato de 1.000 exige confirmar o fim; cache isolado entre empresas.
for (let n = 0; n < 999; n++) add('HUMANO', {company: 'B'});
state.company = 'B'; clockOffset += 61000; state.calls = [];
assert.equal((await get('queueCounts=1')).waiting, 1000);
assert.deepEqual(state.calls.map(c => [c.body.take, c.body.skip]), [[1000, 0], [1000, 1000]]);
state.company = 'A';
// Varredura limitada: informa indisponibilidade em vez de aparentar fila vazia.
state.infinite = true; state.calls = []; clockOffset += 61000;
result = await get('queue=WAITING&search=inexistente'); assert.equal(result.status, 503);
assert.equal(state.calls.length, 10);
assert.ok(state.calls.every(c => c.body.take === 1000));
result = await get('waitingCount=1'); assert.equal(result.status, 500);
assert.equal(result.waitingCount, undefined, 'falha nao pode ser apresentada como zero');
console.log('PASS API: filas exclusivas; filtro/busca antes da paginacao; grupos; finalizados e acesso historico; transicoes/reconsulta; contadores por permissao/setor; isolamento empresa/instancia; limite de varredura. Banco/auth/Evolution simulados.');
