import { prisma } from '@/lib/prisma';
import { confirmedCustomerPhone } from '@/lib/customer-display-identity';
import type { CsvContact } from '@/lib/contact-csv';

export async function importCustomerContacts(companyId: string, contacts: CsvContact[]) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const existing = await transaction.m1MCustomer.findMany({
          where: { companyId },
          select: { customerCode: true, remoteJid: true, phone: true, contactPhone: true },
        });
        const knownJids = new Set(existing.map(customer => customer.remoteJid));
        let lastCode = 0;
        for (const customer of existing) {
          lastCode = Math.max(lastCode, customer.customerCode || 0);
          const confirmed = confirmedCustomerPhone(customer);
          if (confirmed) knownJids.add(confirmed);
          if (customer.contactPhone) knownJids.add(customer.contactPhone.slice(1) + '@s.whatsapp.net');
        }

        const additions = [];
        for (const { name, phone } of contacts) {
          const digits = phone.slice(1);
          const remoteJid = digits + '@s.whatsapp.net';
          if (knownJids.has(remoteJid)) continue;
          knownJids.add(remoteJid);
          additions.push({
            companyId,
            customerCode: ++lastCode,
            remoteJid,
            phone: digits,
            name: name || null,
            nameManuallySet: Boolean(name),
          });
        }
        if (additions.length) await transaction.m1MCustomer.createMany({ data: additions });
        return { imported: additions.length, existing: contacts.length - additions.length };
      }, { isolationLevel: 'Serializable', timeout: 20000 });
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
      if (attempt >= 2 || (code !== 'P2002' && code !== 'P2034')) throw error;
    }
  }
}
