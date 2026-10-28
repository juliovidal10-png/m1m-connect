// Executa os callbacks reais; rede/estado React controlados, sem banco ou WhatsApp.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const root = new URL('../../src/components/chat/', import.meta.url);
const inbox = fs.readFileSync(new URL('ChatInbox.tsx', root), 'utf8');
const source = ts.createSourceFile('ChatInbox.tsx', inbox, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(node, predicate) {
  if (predicate(node)) return node;
  let result;
  ts.forEachChild(node, child => { result ||= find(child, predicate); });
  return result;
}
function run(expression, context) {
  const js = ts.transpileModule(`(() => (${expression}))();`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return vm.runInNewContext(js, context);
}
const changed = find(source, n => ts.isVariableDeclaration(n) && n.name.getText(source) === 'handleAttendanceAssigned').initializer.getText(source);
const load = find(source, n => ts.isVariableDeclaration(n) && n.name.getText(source) === 'loadChats').initializer.arguments[0].getText(source);
const search = find(source, n => ts.isCallExpression(n) && n.expression.getText(source) === 'useEffect' && n.arguments[1]?.getText(source) === '[searchQuery, attendanceRevision]').arguments[0].getText(source);
const item = n => ({ id: `${n}`, remoteJid: `${n}@s.whatsapp.net`, crmCustomerId: `c${n}`, attendanceState: 'HUMANO', attendanceResponsibleId: null, updatedAt: '2026-10-28', unreadCount: 0 });
function setup(length = 130) {
  const state = { chats: Array.from({length}, (_, n) => item(n)), search: [item(120)], selected: item(120), refreshes: 0 };
  const context = {
    selectedChat: state.selected,
    getCanonicalJid: chat => chat.canonicalJid || chat.remoteJid,
    attendanceRevisionRef: {current: 0},
    chatsRef: {current: state.chats},
    loadChatsInFlightRef: {current: false},
    confirmedReadRefreshPendingRef: {current: false},
    setChats: value => {state.chats = value;},
    setSearchResults: value => {state.search = typeof value === 'function' ? value(state.search) : value;},
    setSelectedChat: value => {state.selected = value(state.selected);},
    setAttendanceRevision: value => {state.revision = value;},
    loadChats: async () => {state.refreshes++;},
  };
  return {state, context, changed: run(changed, context)};
}
const assigned = {id: 'a120', customerId: 'c120', state: 'HUMANO', responsibleId: 'user1', sectorId: 'A'};
const count = (chats, assigned) => chats.filter(c => c.attendanceState === 'HUMANO' && Boolean(c.attendanceResponsibleId) === assigned).length;
for (const inFlight of [false, true]) {
  const t = setup();
  t.context.loadChatsInFlightRef.current = inFlight;
  await t.changed(assigned);
  assert.equal(count(t.state.chats, false), 129);
  assert.equal(count(t.state.chats, true), 1);
  assert.equal(t.state.search[0].attendanceResponsibleId, 'user1');
  assert.equal(t.state.selected.attendanceResponsibleId, 'user1');
  assert.equal(t.state.chats[0].attendanceResponsibleId, null);
  assert.equal(t.context.confirmedReadRefreshPendingRef.current, inFlight);
  assert.equal(t.state.refreshes, inFlight ? 0 : 1);
  // Repetir uma confirmacao nao subtrai outra conversa.
  await t.changed(assigned);
  assert.equal(count(t.state.chats, false), 129);
}
// Resposta antiga da lista chega depois da confirmacao de Assumir.
{
  const t = setup(); let release; const queued = [];
  Object.assign(t.context, {
    fetch: () => new Promise(resolve => {release = resolve;}),
    mergeDuplicateChats: items => items,
    isGroupChat: () => false,
    activeChatJidRef: {current: ''},
    setIsLoadingChats() {}, setIsLoadingMoreChats() {}, setHasMoreChats() {}, setErrorMessage() {},
    queueMicrotask: callback => queued.push(callback),
  });
  const loadActual = run(load, t.context);
  const pending = loadActual(false, 'refresh');
  await t.changed(assigned);
  release({ok: true, json: async () => ({items: [item(120)]})});
  await pending;
  assert.equal(t.state.chats.length, 130);
  assert.equal(t.state.chats[120].attendanceResponsibleId, 'user1');
  assert.equal(queued.length, 1, 'nova consulta deve ficar agendada');
  queued[0]();
  assert.equal(t.state.refreshes, 1);
}
// Busca antiga e busca cancelada nao restauram o estado anterior.
for (const cancel of [false, true]) {
  const t = setup(); let timer; let release;
  Object.assign(t.context, {
    searchQuery: 'cliente', AbortController, DOMException, console,
    window: {setTimeout: callback => {timer = callback; return 1;}, clearTimeout() {}},
    fetch: () => new Promise(resolve => {release = resolve;}),
    mergeDuplicateChats: items => items,
  });
  const cleanup = run(search, t.context)();
  const pending = timer();
  if (cancel) cleanup();
  else await t.changed(assigned);
  release({ok: true, json: async () => ({items: [item(120)]})});
  await pending;
  assert.equal(t.state.search[0].attendanceResponsibleId, cancel ? null : 'user1');
  assert.equal(t.state.search.length, 1);
}
// Botao Assumir transmite a confirmacao real da API, nao um decremento estimado.
{
  const actions = fs.readFileSync(new URL('AttendanceActions.tsx', root), 'utf8');
  const ast = ts.createSourceFile('actions.tsx', actions, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const assume = find(ast, n => ts.isFunctionDeclaration(n) && n.name?.text === 'assume').getText(ast);
  let received;
  const callback = run(`(${assume})`, {
    customerId: 'c120', remoteJid: '120@s.whatsapp.net', busy: false,
    setBusy() {}, setError() {},
    fetch: async () => ({ok: true, json: async () => ({attendance: assigned})}),
    onChanged: async data => {received = data;},
  });
  await callback();
  assert.equal(received, assigned);
}
// O Cliente 360 entrega a mesma confirmacao ao mesmo handler do cabecalho.
{
  const quick = fs.readFileSync(new URL('ChatCustomerQuickPanel.tsx', root), 'utf8');
  const ast = ts.createSourceFile('quick.tsx', quick, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const assume = find(ast, n => ts.isFunctionDeclaration(n) && n.name?.text === 'handleAssumeAttendance').getText(ast);
  let received;
  await run(`(${assume})`, {
    customerId: 'c120', isAssigning: false, setIsAssigning() {}, setAssignError() {},
    fetch: async () => ({ok: true, json: async () => ({attendance: assigned})}),
    onAssigned: async data => {received = data;},
  })();
  assert.equal(received, assigned);
  for (const name of ['onAssigned', 'onAttendanceChanged']) {
    assert.equal(find(source, n => ts.isJsxAttribute(n) && n.name.getText(source) === name).initializer.expression.getText(source), 'handleAttendanceAssigned');
  }
}
console.log('PASS: Assumir atualiza filas/lista/busca/selecao alem de 100; idempotencia; concorrencia; busca antiga/cancelada; resposta da API propagada. Rede e React controlados, sem banco/navegador.');
