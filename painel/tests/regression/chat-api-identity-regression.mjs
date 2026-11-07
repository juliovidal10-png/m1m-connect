import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(process.env.TF2_ROUTE_SOURCE || 'src/app/api/chat/list/route.ts', 'utf8');
const start = source.indexOf('function normalizeText(');
const end = source.indexOf('async function getGroupSubject(', start);
assert.ok(start >= 0 && end > start);
const scope = {};
vm.runInNewContext(ts.transpileModule(source.slice(start, end) + '\nthis.dedupe = dedupeEnrichedChats;', {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText, scope);
const phone = '551100000001@s.whatsapp.net';
const lid = '100000000001@lid';
const row = (remoteJid, crmCustomerId, extra = {}) => ({
  remoteJid, crmCustomerId, pushName: 'Mesmo nome',
  updatedAt: '2026-11-07T20:00:00Z', unreadCount: 2,
  lastMessage: { key: { remoteJid } }, ...extra,
});
const pn = row(phone, 'customer-phone');
const linked = row(lid, 'customer-lid', {
  updatedAt: '2026-11-07T20:01:00Z', unreadCount: 1,
  lastMessage: { key: { remoteJid: lid, remoteJidAlt: phone } },
});
for (const input of [[pn, linked], [linked, pn]]) {
  const result = scope.dedupe(input);
  assert.equal(result.length, 1, 'CRM IDs must not split an explicitly linked conversation');
  assert.equal(result[0].canonicalJid, phone);
  assert.equal(result[0].remoteJid, lid);
  assert.equal(result[0].crmCustomerId, 'customer-lid');
  assert.equal(result[0].unreadCount, 1);
  assert.equal(result[0].lastMessage.key.remoteJidAlt, phone);
}
assert.equal(scope.dedupe([pn, row(lid, null)]).length, 2, 'No inferred link from name');
assert.equal(scope.dedupe([pn, row('551100000002@s.whatsapp.net', pn.crmCustomerId)]).length, 2,
  'Shared CRM association must not merge distinct WhatsApp identities');
assert.equal(scope.dedupe([
  row('120000000001@newsletter', 'channel-a'), row('120000000002@newsletter', 'channel-b'),
]).length, 2, 'Distinct channels remain distinct');
assert.equal(scope.dedupe([pn, row('120000000001@g.us', pn.crmCustomerId)]).length, 2,
  'Group and individual remain distinct');
const input = [pn, linked, row('551100000002@s.whatsapp.net', 'other')];
const result = scope.dedupe(input);
assert.equal(result.slice(0, 1).length + result.slice(1, 2).length, 2,
  'Pagination is applied after consolidation');
assert.equal(input.length, 3, 'Input and persisted associations are untouched');
console.log('TF2 API PASS: explicit aliases, divergent CRM IDs, pagination and distinct identities.');
