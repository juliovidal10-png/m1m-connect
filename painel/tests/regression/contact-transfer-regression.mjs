import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies = {}) {
  const context = { exports: {}, require: name => {
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
const { importCustomerContacts } = load('src/services/contact-import.service.ts', {
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
