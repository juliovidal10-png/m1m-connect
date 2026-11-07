import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, require = () => { throw Error('Unexpected dependency'); }) {
  const scope = { exports: {}, require, Date };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, scope);
  return scope.exports;
}
const manifest = load('src/lib/legacy-greeting-manifest.ts');
const { createLegacyGreetingListFilter, legacyGreetingCustomerIds } = load(
  'src/lib/legacy-greeting-list-filter.ts', name => {
    assert.equal(name, './legacy-greeting-manifest'); return manifest;
  },
);
const company = 'empresa-teste', instance = 'M1MTesteIA';
const snapshot = (entry, index = 0) => ({
  id: entry.customerId, companyId: company, remoteJid: entry.remoteJid,
  name: null, phone: null, nameManuallySet: false, company: null, city: null,
  observations: null, responsibleId: null, responsible: null,
  _count: { messages: 1, reminders: 0, paymentReceipts: 0 }, attendances: [],
  messages: [{ companyId: company, instanceName: instance, fromMe: true, type: 'TEXT',
    content: 'Olá! Meu nome é Júlio Vidal e vou continuar seu atendimento por aqui. Como posso te ajudar?',
    evolutionMessageId: `synthetic-${index}`, sentAt: new Date(entry.sentAt) }],
});
const records = manifest.legacyGreetingManifest.map(snapshot);
const chat = row => ({ id: null, remoteJid: row.remoteJid, canonicalJid: row.remoteJid,
  crmCustomerId: row.id, crmName: null, pushName: null, crmPhone: null,
  updatedAt: row.messages[0].sentAt.toISOString(), attendanceState: 'FINALIZADO',
  lastMessage: { key: { id: row.messages[0].evolutionMessageId, fromMe: true, remoteJid: row.remoteJid } },
});
const hide = createLegacyGreetingListFilter(company, instance, records);
assert.equal(records.length, 16, 'Reviewed cohort is fixed');
assert.ok(records.every(row => hide(chat(row))), 'All sixteen reviewed greeting-only snapshots match');
assert.equal(legacyGreetingCustomerIds('another-company', instance).length, 0);
assert.equal(legacyGreetingCustomerIds(company, 'another-instance').length, 0);
assert.equal(createLegacyGreetingListFilter('another-company', instance, records)(chat(records[0])), false);
assert.equal(hide(chat(records[0]), 'busca'), false, 'Search remains available');
const row = records[0], base = chat(row);
for (const changed of [
  { ...base, remoteJid: '123@g.us' }, { ...base, crmCustomerId: 'other' },
  { ...base, id: 'provider-chat-id' }, { ...base, pushName: 'Cliente identificado' },
  { ...base, crmPhone: '551100000001' }, { ...base, canonicalJid: '551100000001@s.whatsapp.net' },
  { ...base, attendanceState: 'HUMANO' }, { ...base, updatedAt: '2026-11-07T22:30:00Z' },
  { ...base, lastMessage: { key: { ...base.lastMessage.key, id: 'new-message' } } },
  { ...base, lastMessage: { key: { ...base.lastMessage.key, fromMe: false } } },
]) assert.equal(hide(changed), false, 'New activity, identity or active attendance restores the row');
for (const changed of [
  { ...row, _count: { ...row._count, messages: 2 } },
  { ...row, _count: { ...row._count, reminders: 1 } },
  { ...row, _count: { ...row._count, paymentReceipts: 1 } },
  { ...row, attendances: [{ id: 'active' }] }, { ...row, nameManuallySet: true },
  { ...row, observations: 'Cadastro comercial' }, { ...row, companyId: 'other' },
  { ...row, messages: [{ ...row.messages[0], fromMe: false }] },
  { ...row, messages: [{ ...row.messages[0], instanceName: 'other' }] },
  { ...row, messages: [{ ...row.messages[0], content: 'Mensagem real' }] },
]) assert.equal(createLegacyGreetingListFilter(company, instance, [changed])(base), false,
  'Customer dependencies or different history must preserve the row');
assert.equal(row._count.messages, 1, 'Records are never mutated');
console.log('TF2 CLEANUP PASS: fixed cohort, tenant isolation, dependencies, new activity and search preservation.');
