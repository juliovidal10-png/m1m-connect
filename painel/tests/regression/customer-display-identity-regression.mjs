import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file, globals = {}) {
  const context = { exports: {}, URL, Date, Map, Set, AbortSignal, ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return context.exports;
}
const pure = load('src/lib/customer-display-identity.ts');
const { presentCustomerIdentity: present, confirmedCustomerPhone: phone } = pure;
const lid = '100000000001@lid', pn = '5511999990001@s.whatsapp.net', other = '5511999990002@s.whatsapp.net';
const anonymous = { id: 'c1', remoteJid: lid, name: null, phone: null };
const contacts = [{ remoteJid: pn, pushName: 'Maria Silva', profilePicUrl: 'https://images.invalid/maria.jpg', isSaved: true }];
const links = [{ principal: lid, alternativo: pn }];
const resolved = present(anonymous, { links, contacts, receivedName: 'Maria' });
assert.equal(resolved.displayName, 'Maria Silva');
assert.equal(resolved.displayPhone, '(11) 99999-0001');
assert.equal(resolved.profilePicUrl, contacts[0].profilePicUrl);
assert.equal(resolved.remoteJid, lid, 'Preserve operational identity and CRM record');
assert.equal(anonymous.phone, null, 'No persistent update');
assert.equal(present({ ...anonymous, name: 'Nome manual', nameManuallySet: true }, { links, contacts }).displayName, 'Nome manual');
assert.equal(present(anonymous, { receivedName: 'Nome recebido' }).displayName, 'Nome recebido');
assert.equal(present(anonymous, { receivedName: 'Você' }).displayName, 'Cliente sem identificação');
assert.equal(present(anonymous, { contacts }).profilePicUrl, null, 'Same name or photo never proves an alias');
assert.equal(present(anonymous, { contacts }).displayPhone, null);
assert.equal(phone({ ...anonymous, phone: lid.split('@')[0], alternativeRemoteJid: lid }), null, 'LID cannot become phone');
assert.equal(phone({ ...anonymous, alternativeRemoteJid: '123@g.us' }), null);
assert.equal(phone(anonymous, { links: [{ principal: pn, alternativo: lid }] }), pn);
assert.equal(phone(anonymous, { links: [...links, { principal: lid, alternativo: other }] }), null, 'Contradictory links are not guessed');
assert.equal(present(anonymous, { links: [...links, { principal: lid, alternativo: other }], contacts }).profilePicUrl, null);
assert.equal(present({ id: 'normal', remoteJid: pn, name: 'Normal', phone: null }, { contacts }).displayPhone, '(11) 99999-0001');
assert.equal(phone({ remoteJid: pn, phone: '(11) 99999-0001' }), pn, 'Preserve saved local format when it matches a confirmed Brazilian JID');
assert.equal(phone({ remoteJid: pn, phone: lid.split('@')[0], alternativeRemoteJid: lid }), pn, 'Reject saved LID even when the main JID is a phone');
assert.equal(present({ id: 'group', remoteJid: '123@g.us', name: 'Grupo', phone: '5511999990001' }, { links, contacts }).displayPhone, null);
assert.equal(present({ id: 'channel', remoteJid: '123@newsletter', name: 'Canal', phone: null }).displayPhone, null);
assert.equal(present(anonymous, { contacts: [{ remoteJid: lid, pushName: 'Mesmo LID', profilePicUrl: 'javascript:alert(1)' }] }).profilePicUrl, null);
const repository = fs.readFileSync('src/repositories/customer.repository.ts', 'utf8');
const repositoryScope = { Date, confirmedCustomerPhone: pure.confirmedCustomerPhone, formatConfirmedPhone: pure.formatConfirmedPhone };
vm.runInNewContext(ts.transpileModule(repository.slice(repository.indexOf('function normalizeOptionalText('),
  repository.indexOf('function buildUpdateData(')) + '\nthis.display = buildDisplayData;', {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText, repositoryScope);
const payload = key => [{ content: 'Saudação de saída', sentAt: new Date(), rawPayload: { key, pushName: 'Você' } }];
assert.equal(repositoryScope.display({ ...anonymous, remoteJid: pn, messages: payload({ remoteJid: pn, remoteJidAlt: lid }) }).displayPhone,
  '(11) 99999-0001', 'Actual repository must not render alternate LID as a phone');
assert.equal(repositoryScope.display({ ...anonymous, messages: payload({ remoteJid: pn, remoteJidAlt: lid }) }).displayPhone,
  '(11) 99999-0001', 'Actual repository accepts the reverse explicit link');
assert.equal(repositoryScope.display({ ...anonymous, messages: payload({ remoteJid: other, remoteJidAlt: pn }) }).displayPhone,
  null, 'Do not trust an alternate identifier unrelated to the customer');

let queries = [], fetches = [], writes = 0;
const prisma = {
  $queryRawUnsafe: async (sql, companyId, instance, ids) => {
    queries.push({ sql, companyId, instance, ids });
    assert.ok(sql.trim().startsWith('SELECT'));
    if (companyId === 'tenant-b') return [];
    return sql.includes('AS name') ? [{ customerId: 'c1', name: 'Nome recebido', principal: lid, alternativo: null }]
      : [{ customerId: 'c1', ...links[0] }];
  },
  update: () => { writes++; throw Error('Writes forbidden'); },
};
const companyRepository = { findById: async companyId => ({ whatsappInstanceName: companyId === 'tenant-b' ? 'instance-b' : 'instance-a' }) };
const deps = {
  '@/lib/prisma': { prisma }, '@/repositories/company.repository': { companyRepository },
  '@/lib/customer-display-identity': pure,
  '@/lib/chat-history-identity': { resolveChatHistoryIdentities: async rows => rows },
};
let offline = false;
const service = load('src/services/customer-display-identity.service.ts', {
  require: name => { assert.ok(deps[name], name); return deps[name]; },
  process: { env: { EVOLUTION_API_URL: 'https://provider.invalid', EVOLUTION_API_KEY: 'test' } },
  fetch: async (url, options) => {
    fetches.push(url);
    assert.equal(options.method, 'POST');
    if (offline) throw Error('Provider unavailable');
    return { ok: true, json: async () => url.endsWith('instance-b') ? [] : contacts };
  },
});
const a = await service.enrichCustomerDisplayIdentities('tenant-a', [anonymous]);
assert.equal(a[0].displayName, 'Maria Silva');
assert.equal(a[0].displayPhone, '(11) 99999-0001');
assert.equal(a[0].profilePicUrl, contacts[0].profilePicUrl);
assert.ok(queries.every(q => q.companyId === 'tenant-a' && q.instance === 'instance-a' && q.ids[0] === 'c1'));
const b = await service.enrichCustomerDisplayIdentities('tenant-b', [{ ...anonymous, alternativeRemoteJid: pn }]);
assert.equal(b[0].displayName, 'Cliente sem identificação');
assert.equal(b[0].displayPhone, null);
assert.equal(b[0].profilePicUrl, null, 'Contacts cache must not cross tenant/instance');
await service.enrichCustomerDisplayIdentities('tenant-a', [anonymous]);
assert.equal(fetches.length, 2, 'Reuse contacts cache within tenant');
offline = true;
const fallback = await service.enrichCustomerDisplayIdentities('tenant-c', [{ id: 'normal', remoteJid: pn, name: 'Normal' }]);
assert.equal(fallback[0].displayName, 'Normal');
assert.equal(fallback[0].displayPhone, '(11) 99999-0001', 'Provider outage preserves confirmed data');
assert.equal(writes, 0);
console.log('TF3 PASS: historical identity, live name/photo, normal contact, missing/conflicting links, LID rejection, read-only scope and provider outage.');

let photoCalls = 0;
const liveDeps = { ...deps, '@/lib/chat-history-identity': {
  resolveChatHistoryIdentities: async rows => rows.map(row => ({ ...row, canonicalJid: pn })),
} };
const live = load('src/services/customer-display-identity.service.ts', {
  require: name => liveDeps[name],
  process: { env: { EVOLUTION_API_URL: 'https://provider.invalid', EVOLUTION_API_KEY: 'test' } },
  fetch: async (url, options) => {
    if (url.includes('/findContacts/')) return { ok: true, json: async () => [] };
    assert.ok(url.includes('/fetchProfilePictureUrl/'));
    assert.equal(JSON.parse(options.body).number, pn.split('@')[0]);
    photoCalls++;
    return { ok: true, json: async () => ({ wuid: pn, profilePictureUrl: 'https://images.invalid/live.jpg' }) };
  },
});
const liveResult = await live.enrichCustomerDisplayIdentities('tenant-b', [anonymous]);
assert.equal(liveResult[0].displayPhone, '(11) 99999-0001');
assert.equal(liveResult[0].profilePicUrl, 'https://images.invalid/live.jpg');
await live.enrichCustomerDisplayIdentities('tenant-b', [anonymous]);
assert.equal(photoCalls, 1);
assert.equal(writes, 0);
console.log('TF3 confirmed-session phone and exact profile-photo fallback PASS');

let releaseProvider;
let deferTask;
const slow = load('src/services/customer-display-identity.service.ts', {
  require: name => deps[name],
  process: { env: { EVOLUTION_API_URL: 'https://provider.invalid', EVOLUTION_API_KEY: 'test' } },
  setTimeout, clearTimeout,
  fetch: async url => {
    assert.match(url, /findContacts/);
    return new Promise(resolve => { releaseProvider = resolve; });
  },
});
const fastList = await slow.enrichCustomerDisplayIdentities('tenant-a', [anonymous], {
  deferProvider: task => { deferTask = task; },
});
assert.equal(fastList[0].displayPhone, '(11) 99999-0001');
assert.equal(fastList[0].displayName, 'Nome recebido');
assert.ok(deferTask, 'The list must return before the unavailable provider');
releaseProvider({ ok: true, json: async () => contacts });
await deferTask;
const warmList = await slow.enrichCustomerDisplayIdentities('tenant-a', [anonymous], {
  deferProvider: () => assert.fail('Warm provider cache must not defer'),
});
assert.equal(warmList[0].displayName, 'Maria Silva');
assert.equal(warmList[0].profilePicUrl, contacts[0].profilePicUrl);
console.log('TF8 PASS: list returns local data while provider is pending, and reuses the completed scoped cache.');

let directoryCalls = 0;
let respond;
const directoryService = load('src/services/customer-display-identity.service.ts', {
  require: name => deps[name],
  fetch: () => {
    directoryCalls++;
    return new Promise(resolve => { respond = resolve; });
  },
});
const directory = (company = 'a', fresh = false) =>
  directoryService.getWhatsAppContactDirectory(company, 'wa-a', 'https://provider.invalid', 'key', fresh);
const firstDirectory = directory();
const overlappingDirectory = directory();
assert.equal(directoryCalls, 1, 'Open inbox and identity lookup share one provider request');
respond({ ok: true, json: async () => [{ ...contacts[0], id: 'c', isGroup: false, type: 'contact' }] });
const [initial, overlap] = await Promise.all([firstDirectory, overlappingDirectory]);
assert.equal(initial[0].id, 'c');
assert.equal(initial[0].type, 'contact');
assert.equal(overlap, initial);
assert.equal(await directory(), initial, 'Reopening uses the scoped directory cache');
const otherCompany = directory('b');
assert.equal(directoryCalls, 2);
respond({ ok: true, json: async () => [] });
assert.equal((await otherCompany).length, 0);
const exportDirectory = directory('a', true);
assert.equal(directoryCalls, 3, 'Explicit export requests fresh data');
respond({ ok: false });
assert.equal(await exportDirectory, null, 'Provider failures cannot masquerade as empty exports');
console.log('TF8 PASS: shared contact directory, tenant isolation and fresh export.');
