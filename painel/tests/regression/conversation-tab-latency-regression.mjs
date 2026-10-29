// Rota real com I/O sintetico temporizado; nao mede a producao.
// --compare-base=<sha> permite reproduzir a versao anterior, sem depender dela no CI futuro.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const src = new URL('../../src/', import.meta.url);
function moduleTS(text, modules = {}, globals = {}) {
  const code = ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText;
  const module = {exports: {}};
  vm.runInNewContext(code, {module, exports: module.exports, require: name => modules[name] ?? require(name), URL, Request, Response, AbortController, AbortSignal, console: {log() {}, warn() {}, error() {}}, process: {env: {EVOLUTION_API_URL: 'http://synthetic-evolution', EVOLUTION_API_KEY: 'synthetic-key'}}, ...globals});
  return module.exports;
}
const queue = moduleTS(fs.readFileSync(new URL('lib/conversation-queue.ts', src), 'utf8'));
const base = process.argv.find(x => x.startsWith('--compare-base='))?.split('=')[1];
const candidateSource = fs.readFileSync(new URL('app/api/chat/list/route.ts', src), 'utf8');
const raw = [], customers = [], attendances = [];
for (let n = 0; n < 244; n++) {
  const group = n < 240;
  const jid = group ? `1203${n}@g.us` : `5565999${n}@s.whatsapp.net`;
  raw.push({remoteJid: jid, pushName: `Conversa ${n}`, updatedAt: new Date(1800000000000 - n*1000).toISOString()});
  if (!group) {
    customers.push({id: `c${n}`, companyId: 'A', remoteJid: jid, name: `Conversa ${n}`, attendances: []});
    if(n < 243) attendances.push({id: `a${n}`, companyId: 'A', customerId: `c${n}`, state: 'HUMANO', sectorId: 'A', responsibleId: n === 242 ? 'user1' : null, startedAt: n});
  }
}
for (const c of customers) c.attendances = attendances.filter(a => a.customerId === c.id);
async function benchmark(text, label) {
  let chatCalls = 0, groupCalls = 0;
  const route = moduleTS(text, {
    '@/lib/conversation-queue': queue,
    '@/generated/prisma/enums': {M1MUserPermission: {VIEW_ALL_CONVERSATIONS: 'all'}},
    '@/lib/tenant': {getAuthenticatedCompanyId: async () => 'A'},
    '@/lib/prisma': {prisma: {m1MCustomer: {findMany: async () => customers}, m1MAttendance: {findMany: async () => attendances}}},
    '@/services/auth/authorization.service': {authorizationService: {getCurrentUser: async () => ({companyId: 'A', userId: 'user1'}), hasPermission: () => true}},
    '@/repositories/company.repository': {companyRepository: {findById: async () => ({id: 'A', name: 'Synthetic', whatsappInstanceName: 'instance-A'})}},
  }, {fetch: async (url, options) => {
    const group = url.includes('/group/');
    if(group) groupCalls++; else chatCalls++;
    await new Promise(resolve => setTimeout(resolve, group ? 3 : 2));
    if(group) return Response.json({subject: 'Grupo sintetico'});
    const {skip, take} = JSON.parse(options.body);
    return Response.json(raw.slice(skip, skip+take));
  }});
  const get = async params => route.GET(new Request('http://test/api/chat/list?'+params));
  const coldStart = performance.now();
  const cold = await Promise.all([get('queueCounts=1'), get('waitingCount=1')]);
  const [tabCounts, alertCount] = await Promise.all(cold.map(r => r.json()));
  assert.equal(alertCount.waitingCount, tabCounts.waiting);
  const sharedCold = {version: label, scenario: 'abas+alerta simultaneos, inventario frio', ms: Math.round((performance.now()-coldStart)*10)/10, chatCalls, groupCalls};
  if(label === 'candidate') { assert.equal(chatCalls, 2); assert.equal(groupCalls, 0); }

  const rows = [];
  for (const selected of ['OPEN','WAITING','IN_SERVICE','OPEN']) {
    const beforeChat = chatCalls, beforeGroup = groupCalls, start = performance.now();
    const response = await get('queue='+selected+'&limit=30&offset=0');
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.items.length, selected === 'WAITING' ? 2 : selected === 'IN_SERVICE' ? 1 : 30);
    assert.ok(data.items.every(c => queue.getConversationQueue(c) === selected));
    if(label === 'candidate') {
      assert.ok(response.headers.get('server-timing')?.includes('inventory;dur='));
      assert.equal(response.headers.get('x-m1m-list-state'), 'ready');
    }
    rows.push({version: label, queue: selected, status: response.status, items: data.items.length, ms: Math.round((performance.now()-start)*10)/10, chatCalls: chatCalls-beforeChat, groupCalls: groupCalls-beforeGroup});
  }
  if(label === 'candidate') {
    assert.ok(rows[1].chatCalls <= 1); assert.equal(rows[1].groupCalls, 0);
    assert.equal(rows[2].chatCalls, 0); assert.equal(rows[2].groupCalls, 0);
    const empty = await get('queue=WAITING&search=inexistente');
    assert.equal(empty.headers.get('x-m1m-list-state'), 'empty');
    assert.equal((await empty.json()).items.length, 0);
    // Contador continua consultando o estado atual, e nao um valor calculado da pagina.
    attendances[0].responsibleId = 'user1';
    const totals = await (await get('queueCounts=1')).json();
    assert.equal(totals.waiting, 1); assert.equal(totals.inService, 2);
  }
  return [sharedCold, ...rows];
}
const rows = [];
if(base) rows.push(...await benchmark(execFileSync('git', ['show', base+':painel/src/app/api/chat/list/route.ts'], {encoding:'utf8'}), 'baseline'));
rows.push(...await benchmark(candidateSource, 'candidate'));
console.log(JSON.stringify({environment:'SYNTHETIC_IO: chat=2ms, group=3ms; sem producao/banco/auth/navegador reais', measurements:rows}, null, 2));
console.log('PASS: abas nao repetem varredura por fila/poll; grupos de outras filas nao sao consultados; estado vazio explicito e totais preservados.');
