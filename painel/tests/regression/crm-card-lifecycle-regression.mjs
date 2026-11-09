import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const load = (file, deps) => {
  const context = { exports: {}, Date, Set, require: name => {
    assert.ok(Object.hasOwn(deps, name), `Unexpected dependency ${name}`);
    return deps[name];
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText, context);
  return context.exports;
};
const row = (id, extra = {}) => ({ id, firstFromMe: null, removedAt: null, manuallyAddedAt: null,
  company: null, city: null, observations: null, ...extra });
const counts = { messages: 12, attendances: 2, reminders: 3, paymentReceipts: 1 };
const records = [
  { id: 'incoming', companyId: 'a', crmCardRemovedAt: null, _count: counts },
  { id: 'outgoing', companyId: 'a', crmCardRemovedAt: null, _count: counts },
  { id: 'foreign', companyId: 'b', crmCardRemovedAt: null, _count: counts },
];
const relations = { contacts: ['incoming','outgoing','foreign'], messages: ['message-1'], attendances: ['attendance-1'],
  reminders: ['reminder-1'], paymentReceipts: ['receipt-1'], finance: ['finance-1'] };
const before = JSON.stringify(relations);
let writes = [], queryScopes = [];
const prisma = {
  $queryRawUnsafe: async (sql, companyId) => {
    queryScopes.push(companyId);
    assert.match(sql, /"companyId" = \$1/);
    assert.match(sql, /c.id = m\."customerId" AND c\."companyId" = m\."companyId"/);
    assert.match(sql, /m\."instanceName" = company\."whatsappInstanceName"/);
    assert.match(sql, /ORDER BY m\."customerId", m\."sentAt" ASC, m\."createdAt" ASC, m.id ASC/);
    assert.match(sql, /NOT IN \('REACTION', 'UNKNOWN'\)/);
    return companyId === 'a' ? [row('incoming', { firstFromMe: false, removedAt: records[0].crmCardRemovedAt }),
      row('outgoing', { firstFromMe: true })] : [row('foreign', { firstFromMe: false })];
  },
  m1MCustomer: {
    findFirst: async ({ where }) => records.find(r => r.id === where.id && r.companyId === where.companyId) || null,
    updateMany: async ({ where, data }) => {
      writes.push({ where, data });
      assert.ok(where.id && where.companyId, 'Every mutation is individually tenant scoped');
      assert.equal(Object.keys(data).length, 1);
      assert.ok('crmCardRemovedAt' in data || 'crmManuallyAddedAt' in data, 'No CRM deletion may alter related records');
      const record = records.find(r => r.id === where.id && r.companyId === where.companyId && r.crmCardRemovedAt === where.crmCardRemovedAt);
      if (record) Object.assign(record, data);
      return { count: record ? 1 : 0 };
    },
  },
};
const { crmService, isCrmCardEligible } = load('src/services/crm.service.ts', { '@/lib/prisma': { prisma } });
assert.equal(isCrmCardEligible(row('in', { firstFromMe: false })), true, 'Customer starts: card appears');
assert.equal(isCrmCardEligible(row('out', { firstFromMe: true })), false, 'Company starts: no automatic card');
assert.equal(isCrmCardEligible(row('empty')), false, 'A technical customer without messages is not a CRM card');
assert.equal(isCrmCardEligible(row('manual', { firstFromMe: true, manuallyAddedAt: new Date() })), true);
assert.equal(isCrmCardEligible(row('legacy', { firstFromMe: true, observations: 'Contrato manual' })), true);
assert.equal(isCrmCardEligible(row('removed', { firstFromMe: false, manuallyAddedAt: new Date(), removedAt: new Date() })), false);
assert.deepEqual([...await crmService.visibleCustomerIds('a')], ['incoming']);
const Permission = { EDIT_CRM: 'EDIT_CRM', DELETE_CONVERSATIONS:'DELETE_CONVERSATIONS', MANAGE_AI:'MANAGE_AI', MANAGE_KNOWLEDGE:'MANAGE_KNOWLEDGE' };
const Role = { ADMIN:'ADMIN', MANAGER:'MANAGER', ATTENDANT:'ATTENDANT', FINANCE:'FINANCE' };
let activeUser = { id:'user-a', companyId:'a', active:true, role:'ADMIN', isPrimary:true, useCustomPermissions:false, permissions:[] };
const auth = load('src/services/auth/authorization.service.ts', {
  '@/generated/prisma/enums': { M1MUserPermission: Permission, M1MUserRole: Role },
  '@/lib/tenant': { getAuthenticatedSession: async () => ({ companyId:'a', userId:'user-a' }) },
  '@/repositories/user.repository': { userRepository: { findById: async () => activeUser } },
});
const deps = {
  'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
  '@/generated/prisma/enums': { M1MUserPermission: Permission },
  '@/services/auth/authorization.service': auth,
  '@/services/crm.service': { crmService },
  '@/services/customer.service': { customerService: { listCustomers: async ({companyId}) => {
    assert.equal(companyId, 'a'); return records.map(r => ({ ...r, isGroup:false }));
  } } },
  '@/services/customer-display-identity.service': { enrichCustomerDisplayIdentities: async (companyId, cards) => {
    assert.equal(companyId,'a'); return cards;
  } },
};
const list = load('src/app/api/crm/cards/route.ts', deps);
const remove = load('src/app/api/crm/cards/[customerId]/route.ts', deps);
let result = await list.GET();
assert.equal(result.status,200);
assert.deepEqual(Array.from(result.body.cards, c => c.id), ['incoming']);
assert.equal(result.body.canDeleteCard,true);
const callDelete = id => remove.DELETE({}, { params: Promise.resolve({ customerId:id }) });
activeUser = { ...activeUser, isPrimary:false, useCustomPermissions:true, permissions:[] };
const writesBefore = writes.length;
assert.equal((await callDelete('incoming')).status,403);
assert.equal(writes.length,writesBefore,'Unauthorized user cannot mutate visibility');
assert.equal((await list.GET()).body.canDeleteCard,false);
activeUser = { ...activeUser, permissions:['EDIT_CRM'] };
assert.equal((await callDelete('foreign')).status,404);
assert.equal(writes.length,writesBefore,'Foreign tenant card never touched');
assert.equal((await callDelete('incoming,outgoing')).status,400,'No bulk deletion');
result = await callDelete('incoming');
assert.equal(result.status,200);
assert.equal(result.body.customerId,'incoming');
assert.deepEqual(result.body.preserved,counts);
assert.ok(records[0].crmCardRemovedAt);
assert.equal(records[1].crmCardRemovedAt,null);
assert.equal(records[2].crmCardRemovedAt,null);
assert.equal(JSON.stringify(relations),before,'Contact, messages, attendance, agenda and finance remain intact');
assert.deepEqual([...await crmService.visibleCustomerIds('a')], [], 'Reload does not resurrect removed card');
await crmService.markManuallyAdded('a','incoming');
assert.deepEqual([...await crmService.visibleCustomerIds('a')], [], 'Saving customer details does not undo card removal');
assert.equal((await callDelete('incoming')).status,200,'Retry is idempotent');
console.log('TF5 PASS: inbound/outbound/manual eligibility, actual API/auth, tenant isolation, individual removal, preserved links and reload. SQL and Prisma operations mocked; production validation pending.');
// Exercise the actual UI deletion handler: selecting one card produces exactly one DELETE,
// and failed requests cannot remove anything from the visible list.
const uiSource = fs.readFileSync('src/components/crm/CrmOperacional.tsx','utf8');
const uiState = { cardToDelete: { id:'selected-card' }, isDeletingCard:false, customers:[{id:'selected-card'},{id:'keep-card'}],
  setIsDeletingCard: value => { uiState.isDeletingCard=value; }, setDeleteError: value => { uiState.deleteError=value; },
  setCustomers: change => { uiState.customers=change(uiState.customers); }, setCardToDelete: value => { uiState.cardToDelete=value; },
  fetch: async (url, options) => {
    assert.equal(url,'/api/crm/cards/selected-card'); assert.equal(options.method,'DELETE');
    return {ok:true,json:async()=>({removed:true})};
  }, encodeURIComponent,
};
const handler = uiSource.slice(uiSource.indexOf('  async function removeSelectedCard()'),uiSource.indexOf('  const [\n    customers,'));
vm.runInNewContext(ts.transpileModule(handler+'\nthis.remove=removeSelectedCard;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,uiState);
await uiState.remove();
assert.deepEqual(uiState.customers,[{id:'keep-card'}]);
assert.equal(uiState.cardToDelete,null);
uiState.cardToDelete={id:'selected-card'};uiState.customers=[{id:'selected-card'},{id:'keep-card'}];
uiState.fetch=async()=>({ok:false,json:async()=>({error:'Negado'})});
await uiState.remove();
assert.equal(uiState.customers.length,2);
assert.equal(uiState.deleteError,'Negado');
assert.match(uiSource,/canDeleteCard &&/);
assert.match(uiSource,/Somente este card sairá do CRM/);
console.log('TF5 UI PASS: selected-card request, successful refresh, permission-gated action and failed deletion preservation.');
