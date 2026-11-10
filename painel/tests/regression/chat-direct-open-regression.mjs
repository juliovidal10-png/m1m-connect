import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText;
const identity = { exports: {}, URL };
vm.runInNewContext(compile(fs.readFileSync('src/lib/customer-display-identity.ts', 'utf8')), identity);
const jid = '5565999990123@s.whatsapp.net';
const companyId = 'empresa-a';
const instanceName = 'wa-a';
const customer = { id: 'cliente-a', remoteJid: jid, name: 'Cliente A', createdAt: new Date('2026-11-08T13:00:00Z'), crmManuallyAddedAt: null, attendances: [] };
let directMode = true;
const queueRules = { exports: {} };
vm.runInNewContext(compile(fs.readFileSync('src/lib/conversation-queue.ts', 'utf8')), queueRules);
let providerCalls = 0;
let permitted = true;
let deleted = false;
let messageAvailable = true;
let attendance = [];
let calls = 0;
let sectors = [{ sectorId: 'setor-a' }];
const deps = {
  '@/lib/conversation-queue': queueRules.exports,
  '@/services/auth/authorization.service': { authorizationService: {
    getCurrentUser: async () => ({ companyId, userId: 'atendente-a' }),
    hasPermission: () => permitted,
  } },
  '@/generated/prisma/enums': { M1MUserPermission: { VIEW_ALL_CONVERSATIONS: 'VIEW_ALL_CONVERSATIONS' } },
  'next/server': { after: () => { assert.equal(directMode, false, 'Direct open schedules no provider work'); },
    NextResponse: { json: (data, options) => ({ data, options }) } },
  'node:crypto': {},
  '@/lib/chat-history-identity': { resolveChatHistoryIdentities: async (rows, scope) => {
    if (directMode) assert.equal(scope.allowDiscovery, false);
    return rows;
  } },
  '@/lib/legacy-greeting-list-filter': { createLegacyGreetingListFilter: () => () => false, legacyGreetingScope: () => false },
  '@/services/customer-display-identity.service': {
    enrichCustomerDisplayIdentities: async (_company, rows) => {
      assert.equal(directMode, false, 'Direct open does not await provider enrichment');
      return rows.map(row => identity.exports.presentCustomerIdentity(row));
    },
  },
  '@/lib/customer-display-identity': identity.exports,
  '@/lib/tenant': {},
  '@/repositories/company.repository': { companyRepository: { findById: async id => {
    assert.equal(id, companyId);
    return { whatsappInstanceName: instanceName };
  } } },
  '@/services/conversation-deletion.service': {
    deletionListSnapshot: async (company, instance) => {
      assert.equal(company, companyId);
      assert.equal(instance, instanceName);
      return deleted ? [{ state: 'DELETED', aliases: [jid] }] : [];
    },
  },
  '@/lib/prisma': { prisma: {
    m1MSectorUser: { findMany: async () => sectors },
    m1MCustomer: { findMany: async ({ where }) => {
      assert.equal(where.companyId, companyId);
      assert.equal(where.remoteJid, directMode ? jid : undefined);
      return [customer];
    } },
    m1MAttendance: { findMany: async ({ where }) => {
      assert.equal(where.companyId, companyId);
      assert.equal(where.customer?.remoteJid, directMode ? jid : undefined);
      return attendance;
    } },
    m1MMessage: { findFirst: async ({ where }) => {
      calls++;
      assert.equal(where.companyId, companyId);
      assert.equal(where.instanceName, instanceName);
      assert.equal(where.customer.remoteJid, jid);
      return messageAvailable ? {
        sentAt: new Date('2026-11-09T13:00:00Z'),
        rawPayload: { key: { id: 'm1', remoteJid: jid, fromMe: false }, message: { conversation: 'Olá' } },
      } : null;
    } },
  } },
};
const context = { exports: {}, URL, AbortSignal,
  process: { env: { EVOLUTION_API_URL: 'https://provider.invalid', EVOLUTION_API_KEY: 'test' } },
  console: { log() {}, error() {} },
  fetch: async () => {
    assert.equal(directMode, false, 'Direct open should not request Evolution');
    providerCalls++;
    return { ok: true, json: async () => [{ remoteJid: jid }] };
  },
  require: name => { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; },
};
vm.runInNewContext(compile(fs.readFileSync('src/app/api/chat/list/route.ts', 'utf8')), context);
const open = (value = jid) => context.exports.GET({ url: 'https://panel.invalid/api/chat/list?directJid=' + encodeURIComponent(value) });
const response = await open();
assert.equal(response.data.items[0].remoteJid, jid);
assert.equal(response.data.items[0].crmCustomerId, customer.id);
assert.match(response.options.headers['Server-Timing'], /direct;dur=/);
assert.equal((await open('invalido')).options.status, 400);
messageAvailable = false;
assert.equal((await open()).data.items.length, 0);
customer.crmManuallyAddedAt = new Date('2026-11-08T13:00:00Z');
const firstConversation = await open();
assert.equal(firstConversation.data.items.length, 1);
assert.equal(firstConversation.data.items[0].crmCustomerId, customer.id);
assert.equal(firstConversation.data.items[0].remoteJid, jid);
assert.equal(firstConversation.data.items[0].lastMessage, undefined);
assert.equal(firstConversation.data.items[0].updatedAt, customer.createdAt.toISOString());
assert.equal(providerCalls, 0);
deleted = true;
assert.equal((await open()).data.items.length, 0, 'A manual contact does not bypass deletion visibility');
deleted = false;
permitted = false;
assert.equal((await open()).data.items.length, 0, 'A manual contact does not bypass sector visibility');
permitted = true;
customer.crmManuallyAddedAt = null;
messageAvailable = true;
deleted = true;
assert.equal((await open()).data.items.length, 0);
deleted = false;
permitted = false;
assert.equal((await open()).data.items.length, 0);
attendance = [{ customerId: customer.id, state: 'HUMANO', sectorId: 'setor-b', events: [] }];
assert.equal((await open()).data.items.length, 0);
attendance[0].sectorId = 'setor-a';
attendance[0].responsibleId = 'outra-pessoa';
assert.equal((await open()).data.items.length, 0);
attendance[0].responsibleId = 'atendente-a';
assert.equal((await open()).data.items.length, 1);
sectors = [];
const before = calls;
assert.equal((await open()).data.items.length, 0);
assert.equal(calls, before);

directMode = false;
permitted = true;
attendance = [{ customerId: customer.id, state: 'HUMANO', sectorId: 'setor-a', events: [] }];
const request = query => context.exports.GET({ url: 'https://panel.invalid/api/chat/list?' + query, signal: { aborted: false } });
const combined = await request('queue=OPEN&includeCounts=1');
assert.equal(combined.data.items.length, 0, 'Waiting item is outside the open tab');
assert.equal(combined.data.counts.waiting, 1, 'Totals cover all authorized tabs');
assert.equal(combined.data.counts.inService, 0);
assert.equal(providerCalls, 1, 'The page and totals share the inventory request');
const separate = await request('queueCounts=1');
assert.equal(separate.data.waiting, combined.data.counts.waiting);
const noCounts = await request('queue=WAITING&offset=1');
assert.equal(noCounts.data.counts, undefined, 'Additional pages do not calculate totals');

const inbox = fs.readFileSync('src/components/chat/ChatInbox.tsx', 'utf8');
const start = inbox.indexOf('  const resolveChatByRemoteJid =');
const end = inbox.indexOf('  useEffect(', start);
let requests = [];
let miss = false;
const frontend = {
  useCallback: fn => fn,
  chatsRef: { current: [] },
  findChatByRequestedJid: (rows, key) => rows.find(row => row.remoteJid === key),
  mergeDuplicateChats: rows => rows,
  fetch: async url => {
    requests.push(url);
    const items = url.includes('directJid=') ? (miss ? [] : firstConversation.data.items) : [{ remoteJid: jid }];
    return { ok: true, json: async () => ({ items }) };
  },
};
vm.runInNewContext(compile(inbox.slice(start, end) + '\nthis.resolve = resolveChatByRemoteJid;'), frontend);
const opened = await frontend.resolve(jid);
assert.equal(opened.remoteJid, jid);
assert.equal(opened.crmCustomerId, customer.id);
assert.equal(opened.lastMessage, undefined);
assert.equal(requests.length, 1);
assert.match(requests[0], /directJid=/);
miss = true;
requests = [];
assert.equal((await frontend.resolve(jid)).remoteJid, jid);
assert.equal(requests.length, 2);
assert.match(requests[1], /search=/);
console.log('TF8 PASS: exact direct open, first conversation for a manual contact, local history, deletion, tenant, sector, assignee and normal search fallback.');
