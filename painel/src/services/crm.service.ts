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
      WITH candidates AS MATERIALIZED (
        SELECT id, "companyId", "crmCardRemovedAt", "crmManuallyAddedAt", company, city, observations
        FROM m1m_customers
        WHERE "companyId" = $1 AND "crmCardRemovedAt" IS NULL
          AND "remoteJid" ~ '@(s[.]whatsapp[.]net|lid)$'
      ), first_messages AS (
        SELECT DISTINCT ON (m."customerId") m."customerId", m."fromMe"
        FROM m1m_messages m
        JOIN candidates c ON c.id = m."customerId" AND c."companyId" = m."companyId"
        JOIN m1m_companies company ON company.id = c."companyId"
          AND m."instanceName" = company."whatsappInstanceName"
        WHERE m."companyId" = $1 AND c."crmManuallyAddedAt" IS NULL
          AND m.type NOT IN ('REACTION', 'UNKNOWN')
        ORDER BY m."customerId", m."sentAt" ASC, m."createdAt" ASC, m.id ASC
      )
      SELECT c.id, c."crmCardRemovedAt" AS "removedAt", c."crmManuallyAddedAt" AS "manuallyAddedAt",
             c.company, c.city, c.observations, first_message."fromMe" AS "firstFromMe"
      FROM candidates c
      LEFT JOIN first_messages first_message ON first_message."customerId" = c.id
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
