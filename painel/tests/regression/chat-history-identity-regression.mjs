import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('src/lib/chat-history-identity.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText;
const lid = '100000000001@lid', phone = '551100000001@s.whatsapp.net';
const other = '551100000002@s.whatsapp.net';
const scope = { companyId: 'tenant-a', instanceName: 'instance-a', apiUrl: 'https://provider.invalid', apiKey: 'test' };
const chat = { remoteJid: lid, canonicalJid: lid, pushName: 'Same name', lastMessage: { key: { remoteJid: lid } } };
const record = (alternate, primary = lid) => ({ id: 'stored-row', key: { id: 'repeated-wa-id', remoteJid: primary, remoteJidAlt: alternate } });
function loader(fetch, clock = Date) {
  const context = { exports: {}, fetch, AbortSignal, Date: clock };
  vm.runInNewContext(compiled, context);
  return context.exports.resolveChatHistoryIdentities;
}
let calls = 0;
const resolve = loader(async (_url, options) => {
  calls++;
  const body = JSON.parse(options.body);
  assert.equal(body.where.key.remoteJid, lid);
  assert.equal(body.where.key.remoteJidAlt, lid);
  return { ok: true, json: async () => ({ messages: { records: [record(null), record(phone), record(phone)] } }) };
});
const resolved = await resolve([chat, { remoteJid: phone }], scope);
assert.equal(resolved.length, 2, 'Only supplies identities; callers consolidate before pagination');
assert.equal(resolved[0].canonicalJid, phone, 'Examine all repeated WhatsApp IDs');
assert.equal(chat.canonicalJid, lid, 'Never mutate original inventory');
const route = fs.readFileSync('src/app/api/chat/list/route.ts', 'utf8');
const routeScope = {};
vm.runInNewContext(ts.transpileModule(
  route.slice(route.indexOf('function normalizeText('), route.indexOf('async function getGroupSubject(')) +
  '\nthis.dedupe = dedupeEnrichedChats;',
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText, routeScope);
assert.equal(routeScope.dedupe(resolved).length, 1, 'Historical alias must reach the actual API consolidation');
await resolve([chat], scope);
assert.equal(calls, 1, 'Cache lookup within scope');
await resolve([chat], { ...scope, companyId: 'tenant-b' });
await resolve([chat], { ...scope, instanceName: 'instance-b' });
assert.equal(calls, 3, 'Do not share mapping between tenants or instances');

for (const records of [[], [record(phone), record(other)], [record(phone, '999999999999@lid')]]) {
  const noLink = loader(async () => ({ ok: true, json: async () => ({ messages: { records } }) }));
  assert.equal((await noLink([chat], scope))[0].canonicalJid, lid, 'Empty, contradictory or unscoped evidence must not merge');
}
const reversed = loader(async () => ({ ok: true, json: async () => ({ messages: { records: [record(lid, phone)] } }) }));
assert.equal((await reversed([chat], scope))[0].canonicalJid, phone);
const unavailable = loader(async () => { throw Error('Provider unavailable'); });
assert.equal((await unavailable([chat], scope))[0].canonicalJid, lid);
let now = Date.now(), phase = 0;
const stable = loader(async () => {
  if (phase === 2) throw Error('Temporary outage');
  return { ok: true, json: async () => ({ messages: { records:
    phase === 0 ? [record(phone)] : phase === 1 ? [] : [record(phone), record(other)],
  } }) };
}, { now: () => now });
for (phase = 0; phase < 3; phase++) {
  assert.equal((await stable([chat], scope))[0].canonicalJid, phone,
    'Confirmed link survives expired cache, rolling samples and outages');
  now += 300001;
}
assert.equal((await stable([chat], scope))[0].canonicalJid, lid, 'Observed conflict overrides cached link');
let discovery = 0;
const bounded = loader(async () => { discovery++; return { ok: true, json: async () => ({ messages: { records: [] } }) }; });
const many = Array.from({ length: 12 }, (_, i) => ({ remoteJid: `${100000000010 + i}@lid` }));
await bounded(many, scope);
assert.equal(discovery, 4);
await bounded(many, scope);
assert.equal(discovery, 8, 'Later polling progresses past cached unresolved identities');
await bounded(many, { ...scope, allowDiscovery: false });
assert.equal(discovery, 8, 'Repeated enrichment in the same HTTP request must not restart discovery');
await bounded([{ remoteJid: '123@g.us', lastMessage: chat.lastMessage }, { remoteJid: '123@newsletter' }], scope);
assert.equal(discovery, 8, 'Never resolve group participants or channels as direct contacts');
console.log('TF2 HISTORY PASS: repeated message IDs, explicit links, conflicts, tenant isolation, bounded discovery and failure preservation.');
