// Callbacks reais do ChatInbox e componentes reais; React/HTTP controlados, sem banco/navegador.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = new URL('../../src/components/chat/', import.meta.url);
const inbox = fs.readFileSync(new URL('ChatInbox.tsx', root), 'utf8');
const source = ts.createSourceFile('ChatInbox.tsx', inbox, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(node, predicate) {
  if (predicate(node)) return node;
  let result;
  ts.forEachChild(node, child => {result ||= find(child, predicate);});
  return result;
}
function run(expression, context) {
  const js = ts.transpileModule(`(() => (${expression}))();`, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
  return vm.runInNewContext(js, context);
}
function variable(name, callback = false) {
  const declaration = find(source, n => ts.isVariableDeclaration(n) && n.name.getText(source) === name);
  return (callback ? declaration.initializer.arguments[0] : declaration.initializer).getText(source);
}
const queueCode = ts.transpileModule(fs.readFileSync(new URL('../../src/lib/conversation-queue.ts', import.meta.url), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
const queueModule = {exports: {}};
vm.runInNewContext(queueCode, {module: queueModule, exports: queueModule.exports});
const {getConversationQueue} = queueModule.exports;
const item = n => ({id: `${n}`, remoteJid: `${n}@s.whatsapp.net`, crmCustomerId: `c${n}`, attendanceState: 'HUMANO', attendanceResponsibleId: null, updatedAt: '2026-10-28', unreadCount: 99});
function setup(length = 130, queue = 'WAITING') {
  const state = {chats: Array.from({length}, (_, n) => item(n)), selected: item(120), refreshes: 0, counts: null, queued: []};
  const context = {
    selectedChat: state.selected,
    getCanonicalJid: chat => chat.canonicalJid || chat.remoteJid,
    getConversationQueue, URLSearchParams,
    attendanceRevisionRef: {current: 0},
    listScopeRef: {current: {queue, search: '', revision: 0}},
    chatsRef: {current: state.chats},
    loadChatsInFlightRef: {current: false},
    confirmedReadRefreshPendingRef: {current: false},
    queueCountsRequestRef: {current: {inFlight: false, pending: false}},
    setChats: value => {state.chats = value;},
    setSelectedChat: value => {state.selected = value(state.selected);},
    setQueueCounts: value => {state.counts = value;},
    setIsLoadingChats() {}, setIsLoadingMoreChats() {}, setHasMoreChats(value) {state.hasMore = value;},
    setErrorMessage(value) {state.error = value;},
    setActiveQueue(value) {state.activeQueue = value;}, setSearchQuery(value) {state.search = value;},
    mergeDuplicateChats: items => items,
    loadChats: async () => {state.refreshes++;},
    loadQueueCounts: async () => {state.countsRefreshed = true;},
    queueMicrotask: callback => state.queued.push(callback),
  };
  return {state, context, changed: run(variable('handleAttendanceChanged'), context)};
}
const assigned = {id: 'a120', customerId: 'c120', state: 'HUMANO', responsibleId: 'user1', sectorId: 'A'};
for (const queue of ['OPEN', 'WAITING', 'IN_SERVICE']) {
  const t = setup(130, queue);
  if (queue === 'OPEN') {
    t.state.chats.forEach(chat => {chat.attendanceState = 'IA';});
    t.state.selected.attendanceState = 'IA';
  }
  if (queue === 'IN_SERVICE') t.state.chats.forEach(chat => {chat.attendanceResponsibleId = 'user1';});
  await t.changed(assigned);
  assert.equal(t.state.chats.length, queue === 'IN_SERVICE' ? 130 : 129);
  assert.equal(t.state.selected.attendanceResponsibleId, 'user1');
  assert.equal(t.state.countsRefreshed, true);
  await t.changed(assigned);
  assert.equal(t.state.chats.length, queue === 'IN_SERVICE' ? 130 : 129, 'confirmacao repetida nao subtrai outro item');
  await t.changed({...assigned, responsibleId: null, state: 'FINALIZADO'});
  assert.ok(!t.state.chats.some(c => c.crmCustomerId === assigned.customerId));
  assert.equal(t.state.selected.attendanceState, 'FINALIZADO', 'historico selecionado preservado');
}
// Atualiza todos os itens carregados em paginas <=100; nenhum rabo antigo e preservado.
{
  const t = setup(); const requests = [];
  t.context.fetch = async url => {
    const params = new URL('http://test' + url).searchParams; requests.push(params);
    const offset = Number(params.get('offset')), limit = Number(params.get('limit'));
    const items = Array.from({length: 130}, (_, n) => ({...item(n), attendanceSectorId: 'fresh'}));
    return {ok: true, json: async () => ({items: items.slice(offset, offset+limit), hasMore: offset+limit < 130})};
  };
  await run(variable('loadChats', true), t.context)(false, 'refresh');
  assert.equal(requests.length, 2); assert.equal(requests[0].get('limit'), '100'); assert.equal(requests[1].get('offset'), '100');
  assert.equal(t.state.chats[129].attendanceSectorId, 'fresh'); assert.equal(t.state.chats.length, 130);
}
// Resposta anterior a Assumir ou a troca de fila/busca nao pode restaurar a lista antiga.
for (const change of ['assignment', 'queue', 'search']) {
  const t = setup(); let release;
  t.context.fetch = () => new Promise(resolve => {release = resolve;});
  const pending = run(variable('loadChats', true), t.context)(false, 'refresh');
  if (change === 'assignment') await t.changed(assigned);
  else run(variable('changeListScope'), t.context)(change === 'queue' ? 'OPEN' : 'WAITING', change === 'search' ? 'novo termo' : '');
  release({ok: true, json: async () => ({items: [item(120)]})});
  await pending;
  assert.equal(t.state.chats.length, change === 'assignment' ? 129 : 0);
  assert.equal(t.state.queued.length, 1);
}
// Busca e paginada pela mesma API/fila; nao ha mescla de resultados globais antigos.
{
  const t = setup(0, 'OPEN'); t.context.listScopeRef.current.search = 'Cliente teste';
  t.context.fetch = async url => {
    const p = new URL('http://test'+url).searchParams;
    assert.equal(p.get('queue'), 'OPEN'); assert.equal(p.get('search'), 'Cliente teste'); assert.equal(p.get('limit'), '30');
    return {ok: true, json: async () => ({items: [{...item(1), attendanceState: 'IA'}], hasMore: false})};
  };
  await run(variable('loadChats', true), t.context)(false, 'append');
  assert.equal(t.state.chats.length, 1);
}
// Contagem atrasada e descartada e reagendada apos uma mudanca operacional.
{
  const t = setup(); let release;
  t.context.fetch = () => new Promise(resolve => {release = resolve;});
  const pending = run(variable('loadQueueCounts', true), t.context)();
  t.context.attendanceRevisionRef.current++;
  release({ok: true, json: async () => ({waiting: 130, inService: 0})});
  await pending;
  assert.equal(t.state.counts, null); assert.equal(t.state.queued.length, 1);
}
// Assumir, transferir e finalizar usam confirmacao API sem recarregar a pagina.
{
  const actions = fs.readFileSync(new URL('AttendanceActions.tsx', root), 'utf8');
  const ast = ts.createSourceFile('actions.tsx', actions, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const [name, path] of [['assume','/api/customers/assign'], ['transferTo','/api/attendance/transfer'], ['finish','/api/attendance/finish']]) {
    const fn = find(ast, n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(ast);
    let received;
    await run(`(${fn})`, {
      customerId: 'c120', remoteJid: '120@s.whatsapp.net', attendanceId: 'a120', busy: false,
      setBusy() {}, setError() {}, setOpen() {},
      window: {confirm: () => true, location: {reload: () => {throw Error('nao deve recarregar');}}},
      fetch: async url => {assert.equal(url, path); return {ok: true, json: async () => ({attendance: assigned})};},
      onChanged: async data => {received = data;},
    })({id: 'B'});
    assert.equal(received, assigned);
  }
  const quick = fs.readFileSync(new URL('ChatCustomerQuickPanel.tsx', root), 'utf8');
  assert.ok(quick.includes('await onAssigned(data.attendance)'));
  for (const name of ['onAssigned', 'onAttendanceChanged']) assert.equal(find(source, n => ts.isJsxAttribute(n) && n.name.getText(source) === name).initializer.expression.getText(source), 'handleAttendanceChanged');
}
// Sidebar real com React SSR: aba Abertas, contadores remotos e trocas controladas pelo pai.
{
  const code = ts.transpileModule(fs.readFileSync(new URL('ChatConversationSidebar.tsx', root), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText;
  const module = {exports: {}};
  vm.runInNewContext(code, {module, exports: module.exports, require});
  const Sidebar = module.exports.default;
  let selectedQueue;
  const props = {activeQueue: 'OPEN', onQueueChange: q => {selectedQueue=q;}, queueCounts: {waiting: 17, inService: 4}, searchQuery: '', onSearchChange() {}, isLoading: false, isLoadingMore: false, hasMore: true, onLoadMore() {}, items: []};
  const element = Sidebar(props);
  const html = require('react-dom/server').renderToStaticMarkup(element);
  assert.ok(html.includes('Abertas')); assert.ok(!html.includes('Todas')); assert.ok(html.includes('Aguardando (17)')); assert.ok(html.includes('Em atendimento (4)'));
  const buttons = [];
  function walk(node) {if (!node || typeof node !== 'object') return; if (Array.isArray(node)) {node.forEach(walk); return;} if(node.type==='button') buttons.push(node); walk(node.props?.children);}
  walk(element);
  for (const [i, queue] of ['OPEN','WAITING','IN_SERVICE'].entries()) {buttons[i].props.onClick(); assert.equal(selectedQueue, queue);}
}
console.log('PASS frontend: filas exclusivas apos acoes; repeticao; item 121 e refresh paginado; concorrencia; troca fila/busca; totais atrasados; Assumir/Transferir/Finalizar sem reload; Sidebar React SSR. Sem navegador/banco reais.');
