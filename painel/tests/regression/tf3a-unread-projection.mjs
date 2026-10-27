import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { unreadSnapshots } from './load-unread-snapshot.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const module = { exports: {} }; let rows = [], queries = [];
vm.runInNewContext(compile('src/services/conversation-unread-projection.service.ts'), { module, exports: module.exports, require(name) {
  if (name === '@/lib/conversation-unread-snapshot') return unreadSnapshots;
  if (name === '@/lib/prisma') return { prisma: { m1MConversationState: { async findMany(query) {
    queries.push(query); assert.equal(query.where.companyId, 'company-test'); assert.equal(query.where.instanceName, 'instance-test');
    return rows.filter(r => r.companyId === query.where.companyId && r.instanceName === query.where.instanceName && query.where.canonicalJid.in.includes(r.canonicalJid));
  } } } };
  throw Error('Import inesperado');
} });
const project = chats => module.exports.projectLedgerUnreadStates('company-test', 'instance-test', chats);
const state = (jid, unreadCount, revision = 1, extra = {}) => ({ companyId: 'company-test', instanceName: 'instance-test', canonicalJid: jid, unreadCount, revision, hiddenAt: null, ...extra });
rows = [state('a@s.whatsapp.net', 0), state('g@g.us', 2, 7), state('hidden@s.whatsapp.net', 5, 8, { hiddenAt: new Date() })];
const input = [{ canonicalJid: 'a@s.whatsapp.net', unreadCount: 99 }, { canonicalJid: 'g@g.us', unreadCount: 0 }, { canonicalJid: 'unknown@s.whatsapp.net', unreadCount: 9 }, { canonicalJid: 'hidden@s.whatsapp.net', unreadCount: 5 }, { unreadCount: 4 }];
const before = JSON.stringify(input), result = await project(input);
assert.equal(JSON.stringify(input), before); assert.equal(result.length, 4); assert.equal(result[0].unreadCount, 0);
assert.equal(result[1].unreadCount, 2); assert.equal(result[1].unreadRevision, 7);
assert.equal(result[2].unreadCount, null); assert.equal(result[2].unreadSource, 'PENDING'); assert.equal(result[3].unreadCount, null);
assert.equal(queries.length, 1);
console.log('PASSOU: estado exato supera inventario, oculta antes de paginar e ausencia fica pendente; lote unico e entrada imutavel.');
rows = [state('a@s.whatsapp.net', 99, 9, { companyId: 'other' }), state('a@s.whatsapp.net', 88, 8, { instanceName: 'other' })];
assert.equal((await project([{ canonicalJid: 'a@s.whatsapp.net' }]))[0].unreadSource, 'PENDING');
console.log('PASSOU: mesmo JID em outra empresa/instancia nao fornece contagem.');
for (const invalid of [state('a@s.whatsapp.net', -1), state('a@s.whatsapp.net', 1, -1), state('a@s.whatsapp.net', 0.5)]) {
  rows = [invalid]; await assert.rejects(project([{ canonicalJid: 'a@s.whatsapp.net' }]));
}
rows = [state('a@s.whatsapp.net', 1), state('a@s.whatsapp.net', 2)]; await assert.rejects(project([{ canonicalJid: 'a@s.whatsapp.net' }]));
console.log('PASSOU: estado invalido ou duplicado interrompe sem inventar valor.');
queries = []; await project([]); assert.equal(queries.length, 0);
console.log('PASSOU: lote vazio nao consulta banco.');
const badgeModule = { exports: {} };
vm.runInNewContext(compile('src/components/chat/ConversationUnreadBadge.tsx'), { module: badgeModule, exports: badgeModule.exports, require });
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const render = props => renderToStaticMarkup(React.createElement(badgeModule.exports.default, props));
assert.equal(render({ count: 0, source: 'LEDGER' }), '');
assert.equal(render({ count: null }), '');
assert.match(render({ count: null, source: 'PENDING' }), /Contagem de não lidas pendente/);
assert.match(render({ count: 3, source: 'LEDGER' }), />3</);
assert.match(render({ count: 2 }), />2</);
console.log('PASSOU: renderizacao SSR distingue pendencia, zero confirmado e badge positivo; legado preservado.');
console.log('TF3-A: projecao real com persistencia simulada e componente real via SSR; nao e banco real ou navegador.');
