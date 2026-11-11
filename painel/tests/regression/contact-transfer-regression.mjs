import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies = {}) {
  const context = { exports: {}, process, require: name => {
    assert.ok(Object.hasOwn(dependencies, name), name);
    return dependencies[name];
  } };
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(compiled, context);
  return context.exports;
}

const phone = load('src/lib/contact-phone.ts');
assert.equal(phone.normalizeContactPhone('(65) 99999-0123'), '+5565999990123');
assert.equal(phone.normalizeContactPhone('  '), null);
assert.equal(phone.maskContactPhoneInput('65999990123'), '(65) 99999-0123');
assert.equal(phone.maskContactPhoneInput('6533330123'), '(65) 3333-0123');
assert.equal(phone.maskContactPhoneInput('659999901234'), null);
assert.equal(phone.maskContactPhoneInput('+55 65 99999-0123'), '+55 (65) 99999-0123');
assert.equal(phone.maskContactPhoneInput('+1 (202) 555-0123'), '+12025550123');
assert.equal(phone.formatSavedContactPhone('+5565999990123'), '(65) 99999-0123');
assert.throws(() => phone.normalizeCustomerContactPhone('(65) 9999-012'), phone.InvalidContactPhone);
assert.throws(() => phone.normalizeCustomerContactPhone('+55659999012'), phone.InvalidContactPhone);
assert.throws(() => phone.normalizeCustomerContactPhone('659999901234'), phone.InvalidContactPhone);

assert.throws(() => phone.normalizeContactPhone('12345678901234@lid'), phone.InvalidContactPhone);
assert.throws(() => phone.normalizeContactPhone('6.55E+12'), phone.InvalidContactPhone);
const csv = load('src/lib/contact-csv.ts', { './contact-phone': phone });
const contacts = [
  { name: 'Júlia; "Loja"', phone: '+5565999990123' },
  { name: '=1+1', phone: '+12025550123' },
];
const exported = csv.contactsToCsv(contacts);
assert.match(exported, /"'=1\+1"/);
assert.deepEqual(JSON.parse(JSON.stringify(csv.parseContactCsv(exported).contacts)), contacts);
const parsed = csv.parseContactCsv('Nome,Telefone\r\nAna,(65) 99999-0123\r\nAna,+5565999990123\r\nLID,123@lid');
assert.equal(parsed.contacts.length, 1);
assert.equal(parsed.duplicates, 1);
assert.equal(parsed.invalid, 1);
assert.throws(() => csv.parseContactCsv('Outra;Coluna\nAna;1234'), csv.InvalidContactCsv);
assert.throws(() => csv.parseContactCsv('Nome;Telefone\n"Ana;+5565999990123'), csv.InvalidContactCsv);

const existing = [{ remoteJid: '12345678901234@lid', phone: null, contactPhone: '+5565999990123', customerCode: 7 }];
const writes = [];
let attempts = 0;
const { importCustomerContacts, createManualCustomer } = load('src/services/contact-import.service.ts', {
  '@/lib/customer-display-identity': load('src/lib/customer-display-identity.ts'),
  '@/lib/prisma': { prisma: {
    async $transaction(action, options) {
      assert.equal(options.isolationLevel, 'Serializable');
      if (++attempts === 1) throw { code: 'P2034' };
      return action({ m1MCustomer: {
        async findMany({ where }) {
          assert.equal(where.companyId, 'empresa-a');
          return existing;
        },
        async createMany({ data }) {
          writes.push(...data);
          existing.push(...data);
        },
      } });
    },
  } },
});
const first = await importCustomerContacts('empresa-a', contacts);
assert.equal(first.imported, 1);
assert.equal(first.existing, 1);
assert.equal(writes[0].customerCode, 8);
assert.equal(writes[0].remoteJid, '12025550123@s.whatsapp.net');
assert.equal(writes[0].companyId, 'empresa-a');
assert.equal((await importCustomerContacts('empresa-a', contacts)).imported, 0);
assert.equal(writes.length, 1);

const { customerService } = load('src/services/customer.service.ts', {
  '@/lib/contact-phone': phone,
  '@/repositories/customer.repository': { customerRepository: { upsert: async data => data } },
});
const updated = await customerService.saveCustomer({
  companyId: 'empresa-a', remoteJid: '12345678901234@lid', contactPhone: '(65) 99999-0123',
});
assert.equal(updated.contactPhone, '+5565999990123');
assert.equal(updated.remoteJid, '12345678901234@lid');
assert.equal(updated.phone, undefined);
console.log('TF6/TF7 PASS: telefone manual separado da identidade, CSV Excel, validação, deduplicação, escopo e reimportação.');

class AuthorizationError extends Error { statusCode = 403; }
const contactList = [
  { id: 'manual-a', customerCode: 398, name: 'Gabriel Barber' },
  { id: 'original-a', customerCode: 140, name: 'Gabriel Vagmaker' },
];
const hiddenCustomers = load('src/lib/hidden-customers.ts');
let company = 'empresa-a';
const { GET: listCustomers } = load('src/app/api/customers/route.ts', {
  'next/server': { NextResponse: { json: body => body } },
  '@/lib/prisma': { prisma: { m1MCustomer: { findMany: async args => {
    assert.equal(args.where.companyId, company);
    assert.equal(args.include, undefined, 'Lookup avoids attendance and message-count relations');
    assert.equal(args.select.customerCode, true);
    return contactList.filter(customer => !args.where.id.notIn.includes(customer.id));
  } } } },
  '@/lib/tenant': { getAuthenticatedCompanyId: async () => company },
  '@/generated/prisma/enums': {},
  '@/lib/contact-phone': phone,
  '@/lib/hidden-customers': hiddenCustomers,
  '@/services/auth/authorization.service': { AuthorizationError },
  '@/services/crm.service': {},
  '@/services/customer.service': { customerService: {
    listCustomers: async () => contactList,
    findCustomer: async () => contactList[0],
  } },
  '@/services/customer-display-identity.service': {
    enrichCustomerDisplayIdentities: async (_, customers, options) => {
      if (options) {
        assert.equal(options?.deferHints, true, 'List/search does not wait on full identity refresh');
        assert.equal(typeof options?.deferProvider, 'function');
      }
      return customers;
    },
  },
});
const listRequest = query => listCustomers({ nextUrl: new URL(`https://example.com/api/customers${query}`) });
const listIds = async query => Array.from(await listRequest(query), customer => customer.id);
const hideContactKey = 'M1M_CONTACTS_HIDDEN_CUSTOMER';
const previousHiddenContact = process.env[hideContactKey];
try {
  delete process.env[hideContactKey];
  assert.deepEqual(await listIds('?view=contacts'), ['manual-a', 'original-a']);
  process.env[hideContactKey] = 'empresa-a/manual-a';
  assert.deepEqual(await listIds('?view=contacts'), ['original-a']);
  assert.deepEqual(await listIds(''), ['original-a']);
  assert.deepEqual(await listIds('?view=lookup&search=Gabriel'), ['original-a']);
  assert.deepEqual(await listIds('?view=lookup&search=Cliente%20%23000140'), ['original-a']);
  assert.deepEqual(await listIds('?view=lookup&search=398'), []);
  assert.equal(await listRequest('?remoteJid=123@s.whatsapp.net'), contactList[0], 'Existing attendance detail remains accessible');
  company = 'empresa-b';
  assert.deepEqual(await listIds('?view=contacts'), ['manual-a', 'original-a']);
  process.env[hideContactKey] = 'empresa-a/manual-a,empresa-a/manual-c\nempresa-b/manual-b,empresa-a/invalid/entry';
  assert.deepEqual(Array.from(hiddenCustomers.hiddenCustomerIds('empresa-a')), ['manual-a', 'manual-c']);
  assert.deepEqual(Array.from(hiddenCustomers.hiddenCustomerIds('empresa-b')), ['manual-b']);
} finally {
  if (previousHiddenContact === undefined) delete process.env[hideContactKey];
  else process.env[hideContactKey] = previousHiddenContact;
}

let repositoryWhere;
const { customerRepository } = load('src/repositories/customer.repository.ts', {
  '@/lib/hidden-customers': { hiddenCustomerIds: () => ['manual-a'] },
  '@/lib/customer-display-identity': load('src/lib/customer-display-identity.ts'),
  '@/lib/prisma': { prisma: { m1MCustomer: { findMany: async ({ where }) => {
    repositoryWhere = where;
    return [];
  } } } },
});
await customerRepository.listByCompany('empresa-a', { customerIds: ['manual-a', 'original-a'] });
assert.equal(repositoryWhere.companyId, 'empresa-a');
assert.deepEqual(Array.from(repositoryWhere.id.notIn), ['manual-a']);
assert.deepEqual(Array.from(repositoryWhere.id.in), ['manual-a', 'original-a']);

let permitted = true;
const { POST: create } = load('src/app/api/customers/new/route.ts', {
  'next/server': { NextResponse: { json: (body, { status }) => ({ body, status }) } },
  '@/generated/prisma/enums': { M1MUserPermission: { EDIT_CRM: 'EDIT_CRM' } },
  '@/lib/contact-phone': phone,
  '@/services/auth/authorization.service': {
    AuthorizationError,
    authorizationService: { requirePermission: async permission => {
      assert.equal(permission, 'EDIT_CRM');
      if (!permitted) throw new AuthorizationError('Sem permissão');
      return { companyId: 'empresa-a' };
    } },
  },
  '@/services/contact-import.service': { createManualCustomer },
});
const request = body => ({ json: async () => body });
assert.equal((await create(request({ name: '  ' , phone: '(65) 99999-7777' }))).status, 400);
assert.equal((await create(request({ name: 'Novo', phone: '(65) 999' }))).status, 400);
assert.equal((await create(request({ name: 'Outro nome', phone: '(65) 99999-0123' }))).status, 409);
assert.equal(writes.length, 1, 'No existing contact is overwritten');
permitted = false;
assert.equal((await create(request({ name: 'Novo', phone: '(65) 99999-7777' }))).status, 403);
permitted = true;
assert.equal((await create(request({ name: ' Novo ', phone: '(65) 99999-7777', companyId: 'empresa-b' }))).status, 201);
assert.equal(writes[1].companyId, 'empresa-a');
assert.equal(writes[1].name, 'Novo');
assert.equal(writes[1].remoteJid, '5565999997777@s.whatsapp.net');
assert.ok(writes[1].crmManuallyAddedAt, 'Explicit registration is visible in CRM');
assert.equal(writes[0].crmManuallyAddedAt, undefined, 'CSV import retains its contact-only behavior');
assert.equal((await create(request({ name: 'Novo', phone: '(65) 99999-7777' }))).status, 409);
assert.equal(writes.length, 2);
console.log('TF9 PASS: validated manual registration, permission, tenant scope, no overwrite and CRM entry.');

assert.equal(writes[0].createdViaNewContact, false);
assert.equal(writes[1].createdViaNewContact, true);

const manual = { id: 'manual-a', companyId: 'empresa-a', createdViaNewContact: true };
const rows = new Map([
  [manual.id, manual],
  ['legacy-a', { ...manual, id: 'legacy-a', createdViaNewContact: false, crmManuallyAddedAt: new Date() }],
  ['manual-b', { ...manual, id: 'manual-b', companyId: 'empresa-b' }],
]);
let linked = null;
let transactions = 0;
const { DELETE: remove } = load('src/app/api/customers/[customerId]/route.ts', {
  'next/server': { NextResponse: { json: (body, { status = 200 } = {}) => ({ body, status }) } },
  '@/generated/prisma/enums': { M1MUserPermission: { EDIT_CRM: 'EDIT_CRM' } },
  '@/services/auth/authorization.service': {
    AuthorizationError,
    authorizationService: { requirePermission: async permission => {
      assert.equal(permission, 'EDIT_CRM');
      if (!permitted) throw new AuthorizationError('Sem permissão');
      return { companyId: 'empresa-a' };
    } },
  },
  '@/lib/prisma': { prisma: {
    async $transaction(action, options) {
      transactions++;
      assert.equal(options.isolationLevel, 'ReadCommitted');
      let lockedId = null;
      return action({
        async $queryRaw(sql, id, companyId) {
          assert.match(sql.join(' '), /"createdViaNewContact"\s+FOR UPDATE/);
          const row = rows.get(id);
          if (!row?.createdViaNewContact || row.companyId !== companyId) return [];
          lockedId = row.id;
          return [{ id }];
        },
        m1MCustomer: { async deleteMany({ where }) {
          assert.equal(where.id, lockedId);
          assert.equal(where.companyId, 'empresa-a');
          assert.equal(where.createdViaNewContact, true);
          for (const relation of ['messages', 'attendances', 'reminders', 'paymentReceipts']) {
            assert.equal(Object.keys(where[relation].none).length, 0);
          }
          if (linked && where[linked].none) return { count: 0 };
          return { count: rows.delete(where.id) ? 1 : 0 };
        } },
      });
    },
  } },
});
const deleteContact = customerId => remove({}, { params: Promise.resolve({ customerId }) });
permitted = false;
assert.equal((await deleteContact(manual.id)).status, 403);
assert.equal(transactions, 0);
permitted = true;
assert.equal((await deleteContact('invalid/id')).status, 400);
assert.equal((await deleteContact('legacy-a')).status, 404);
assert.equal((await deleteContact('manual-b')).status, 404);
for (const relation of ['messages', 'attendances', 'reminders', 'paymentReceipts']) {
  linked = relation;
  assert.equal((await deleteContact(manual.id)).status, 409);
  assert.equal(rows.has(manual.id), true);
}
linked = null;
assert.equal((await deleteContact(manual.id)).body.removed, true);
assert.equal((await deleteContact(manual.id)).status, 404);
assert.deepEqual([...rows.keys()], ['legacy-a', 'manual-b']);
console.log('TF20 PASS: origem manual, autorização, isolamento e bloqueio dos quatro tipos de vínculo.');
