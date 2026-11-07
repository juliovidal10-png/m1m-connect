import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync('src/lib/legacy-greeting-list-filter.ts', 'utf8');
const scope = { exports: {}, Date };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, scope);
const { createLegacyGreetingListFilter, legacyGreetingScope, legacyGreetingPrefix } = scope.exports;
const company = 'empresa-teste', instance = 'M1MTesteIA';
const row = {
  id: 'any-customer-not-in-the-old-manifest', companyId: company,
  remoteJid: '100000000001@lid', name: null, phone: null, attendances: [],
  messages: [{ companyId: company, instanceName: instance, fromMe: true, type: 'TEXT',
    content: legacyGreetingPrefix + ' Como posso te ajudar?',
    evolutionMessageId: 'greeting-id', sentAt: new Date('2026-10-29T21:57:00Z') }],
  historicalMessages: 43, historicalIncoming: 32,
};
const base = { id: 'provider-id-is-allowed', remoteJid: row.remoteJid, canonicalJid: row.remoteJid,
  crmCustomerId: row.id, crmName: null, pushName: null, crmPhone: null,
  updatedAt: row.messages[0].sentAt.toISOString(), attendanceState: 'FINALIZADO',
  lastMessage: { key: { id: 'greeting-id', fromMe: true, remoteJid: row.remoteJid } },
};
const hide = createLegacyGreetingListFilter(company, instance, [row]);
assert.equal(hide(base), true, 'Any matching anonymous old greeting is hidden, even with real older history');
assert.equal(hide({ ...base, attendanceState: 'IA' }), true, 'Stale OPEN IA conversation is eligible');
assert.equal(legacyGreetingScope('another-company', instance), false);
assert.equal(legacyGreetingScope(company, 'another-instance'), false);
assert.equal(createLegacyGreetingListFilter('another-company', instance, [row])(base), false);
assert.equal(hide(base, 'search'), false, 'Search remains available');
for (const changed of [
  { ...base, remoteJid: '123@g.us' }, { ...base, crmCustomerId: 'other' },
  { ...base, pushName: 'Juju Humildemente' }, { ...base, crmName: 'Cliente identificado' },
  { ...base, crmPhone: '551100000001' }, { ...base, canonicalJid: '551100000001@s.whatsapp.net' },
  { ...base, attendanceState: 'HUMANO' }, { ...base, updatedAt: '2026-11-07T22:30:00Z' },
  { ...base, lastMessage: { key: { ...base.lastMessage.key, id: 'new-message' } } },
  { ...base, lastMessage: { key: { ...base.lastMessage.key, fromMe: false } } },
]) assert.equal(hide(changed), false, 'New activity, name, phone or human attendance restores the row');
for (const changed of [
  { ...row, attendances: [{ id: 'human-attendance' }] }, { ...row, name: 'Identified person' },
  { ...row, companyId: 'other' }, { ...row, phone: '551100000001' },
  { ...row, messages: [{ ...row.messages[0], fromMe: false }] },
  { ...row, messages: [{ ...row.messages[0], instanceName: 'other' }] },
  { ...row, messages: [{ ...row.messages[0], content: 'New real message' }] },
  { ...row, messages: [{ ...row.messages[0], sentAt: new Date('2026-11-07T22:30:00Z') }] },
]) assert.equal(createLegacyGreetingListFilter(company, instance, [changed])(base), false);
// No 16/30/50-item cap: an unbounded reviewed class, not a whitelist of IDs.
const many = Array.from({ length: 100 }, (_, i) => ({ ...row, id: `c-${i}`, remoteJid: `${100000000010 + i}@lid` }));
const manyFilter = createLegacyGreetingListFilter(company, instance, many);
assert.equal(many.filter(c => manyFilter({ ...base, remoteJid: c.remoteJid, canonicalJid: c.remoteJid,
  crmCustomerId: c.id, lastMessage: { key: { ...base.lastMessage.key, remoteJid: c.remoteJid } } })).length, 100);
assert.equal(row.historicalMessages, 43, 'Older history is never modified');
console.log('TF2 CLEANUP PASS: full anonymous greeting cohort, older history preserved, new activity, names, scope and search.');
