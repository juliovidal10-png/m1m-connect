import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ts = require('typescript');
const source = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
const ast = ts.createSourceFile('Sidebar.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const effects = [];
function visit(n) {
  if (ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect' && n.arguments[0]?.getText(ast).includes('const refreshTotalCount =')) effects.push(n.arguments[0].getText(ast));
  ts.forEachChild(n, visit);
}
visit(ast); assert.equal(effects.length, 1);
const compiled = ts.transpileModule('module.exports = ' + effects[0], { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));
function scenario(responses) {
  let index = 0, status = 'loading'; const counts = [], kinds = [], timers = new Map(); let timerId = 0;
  const mod = { exports: {} };
  vm.runInNewContext(compiled, { module: mod, exports: mod.exports,
    window: { setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; }, clearTimeout(id) { timers.delete(id); } },
    async fetch(url, options) { assert.equal(url, '/api/chat/list?totalCount=1'); assert.equal(options.cache, 'no-store'); return await responses[Math.min(index++, responses.length - 1)]; },
    setConversationsTotalCount(n) { counts.push(n); }, setConversationCountKind(kind) { kinds.push(kind); },
    setTotalCountStatus(value) { status = typeof value === 'function' ? value(status) : value; },
  });
  const cleanup = mod.exports();
  return { counts, kinds, timers, cleanup, status: () => status,
    async tick() { const [id, timer] = timers.entries().next().value; timers.delete(id); timer.fn(); await flush(); } };
}
const response = (totalCount, countKind) => ({ ok: true, async json() { return { totalCount, ...(countKind === undefined ? {} : { countKind }) }; } });
const unread = scenario([response(4, 'unreadConversations'), response(0, 'unreadConversations')]); await flush();
assert.equal(unread.counts.join(','), '4'); assert.equal([...unread.timers.values()][0].delay, 5000);
await unread.tick(); assert.equal(unread.counts.join(','), '4,0'); unread.cleanup(); assert.equal(unread.timers.size, 0);
console.log('PASSOU: indicador usa valores do servidor e atualiza zero somente quando recebido.');
const legacy = scenario([response(410)]); await flush(); assert.equal(legacy.kinds[0], 'inventory'); assert.equal([...legacy.timers.values()][0].delay, 60000); legacy.cleanup();
console.log('PASSOU: inventario legado preserva intervalo e semantica.');
const stale = scenario([response(4, 'unreadConversations'), { ok: false }]); await flush(); await stale.tick();
assert.equal(stale.counts.join(','), '4'); assert.equal(stale.status(), 'stale'); assert.equal([...stale.timers.values()][0].delay, 5000); stale.cleanup();
console.log('PASSOU: falha posterior preserva valor conhecido como desatualizado.');
for (const value of [{ ok: false }, response(null, 'unreadConversations'), response(1, 'unknown-source')]) {
  const bad = scenario([value]); await flush(); assert.equal(bad.counts.length, 0); assert.equal(bad.status(), 'unavailable'); bad.cleanup();
  console.log('PASSOU: falha ou resposta invalida nao fabrica zero.');
}
let resolve; const delayed = scenario([new Promise(done => { resolve = done; })]); delayed.cleanup(); resolve(response(4, 'unreadConversations')); await flush();
assert.equal(delayed.counts.length, 0); assert.equal(delayed.timers.size, 0);
console.log('PASSOU: desmontagem cancela atualizacao tardia e novo polling.');
console.log('TF3-A: sete cenarios do efeito real da Sidebar com React/rede/timers simulados; sem teste visual.');
