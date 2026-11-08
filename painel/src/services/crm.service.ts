import { prisma } from '@/lib/prisma';

type EligibilityRow = {
  id: string;
  firstFromMe: boolean | null;
  removedAt: Date | null;
  manuallyAddedAt: Date | null;
  company: string | null;
  city: string | null;
  observations: string | null;
};

export function isCrmCardEligible(row: EligibilityRow) {
  if (row.removedAt) return false;
  // Preserve explicit CRM registration and existing manually completed business records.
  if (row.manuallyAddedAt || [row.company, row.city, row.observations].some(value => value?.trim())) return true;
  return row.firstFromMe === false;
}

export const crmService = {
  async visibleCustomerIds(companyId: string): Promise<Set<string>> {
    const rows = await prisma.$queryRawUnsafe<EligibilityRow[]>(`
      SELECT c.id, c."crmCardRemovedAt" AS "removedAt", c."crmManuallyAddedAt" AS "manuallyAddedAt",
             c.company, c.city, c.observations, first_message."fromMe" AS "firstFromMe"
      FROM m1m_customers c
      JOIN m1m_companies company ON company.id = c."companyId"
      LEFT JOIN LATERAL (
        SELECT m."fromMe" FROM m1m_messages m
        WHERE m."companyId" = c."companyId" AND m."customerId" = c.id
          AND m."instanceName" = company."whatsappInstanceName"
          AND m.type::text NOT IN ('REACTION', 'UNKNOWN')
        ORDER BY m."sentAt" ASC, m."createdAt" ASC, m.id ASC LIMIT 1
      ) first_message ON true
      WHERE c."companyId" = $1 AND c."remoteJid" ~ '@(s[.]whatsapp[.]net|lid)$'
    `, companyId);
    return new Set(rows.filter(isCrmCardEligible).map(row => row.id));
  },

  async markManuallyAdded(companyId: string, customerId: string) {
    // Saving CRM details is an explicit action, but never resurrect a removed card.
    await prisma.m1MCustomer.updateMany({
      where: { id: customerId, companyId, crmCardRemovedAt: null },
      data: { crmManuallyAddedAt: new Date() },
    });
  },

  async removeCard(companyId: string, customerId: string) {
    // Identify the selected card and its links before changing only its visibility.
    const customer = await prisma.m1MCustomer.findFirst({
      where: { id: customerId, companyId },
      select: { id: true, crmCardRemovedAt: true, _count: {
        select: { messages: true, attendances: true, reminders: true, paymentReceipts: true },
      } },
    });
    if (!customer) return null;
    await prisma.m1MCustomer.updateMany({
      where: { id: customer.id, companyId, crmCardRemovedAt: null },
      data: { crmCardRemovedAt: new Date() },
    });
    return { removed: true, customerId: customer.id, preserved: customer._count };
  },
};
