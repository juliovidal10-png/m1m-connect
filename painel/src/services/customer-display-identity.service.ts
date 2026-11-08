import { prisma } from '@/lib/prisma';
import { companyRepository } from '@/repositories/company.repository';
import { resolveChatHistoryIdentities } from '@/lib/chat-history-identity';
import { confirmedCustomerPhone, presentCustomerIdentity, usefulIdentityName, normalizeIdentityJid,
  type IdentityCustomer, type IdentityContact, type IdentityLink } from '@/lib/customer-display-identity';

const contactCache = new Map<string, { expiresAt: number; contacts: IdentityContact[] }>();
const contactPending = new Map<string, Promise<IdentityContact[]>>();
async function getContacts(companyId: string, instanceName: string, base: string, apiKey: string): Promise<IdentityContact[]> {
  if (!base || !apiKey) return [];
  const key = JSON.stringify([base, companyId, instanceName]);
  const cached = contactCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.contacts;
  if (contactPending.has(key)) return contactPending.get(key)!;
  const task = (async () => {
    try {
      const response = await fetch(`${base.replace(/\/+$/, '')}/chat/findContacts/${encodeURIComponent(instanceName)}`, {
        method: 'POST', headers: { apikey: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: {} }), cache: 'no-store', signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) return cached?.contacts || [];
      const data = await response.json();
      const rows = Array.isArray(data) ? data : data?.value;
      if (!Array.isArray(rows)) return cached?.contacts || [];
      const contacts: IdentityContact[] = rows.filter(row => row && typeof row.remoteJid === 'string').map(row => ({
        remoteJid: row.remoteJid, pushName: typeof row.pushName === 'string' ? row.pushName : null,
        profilePicUrl: typeof row.profilePicUrl === 'string' ? row.profilePicUrl : null, isSaved: row.isSaved === true,
      }));
      contactCache.set(key, { contacts, expiresAt: Date.now() + 30000 });
      while (contactCache.size > 100) contactCache.delete(contactCache.keys().next().value!);
      return contacts;
    } catch { return cached?.contacts || []; }
  })();
  contactPending.set(key, task);
  try { return await task; } finally { contactPending.delete(key); }
}

type HintData = {
  links: Array<IdentityLink & { customerId: string }>;
  names: Array<IdentityLink & { customerId: string; name: string | null }>;
};
const hintCache = new Map<string, { expiresAt: number; data: HintData }>();
const hintPending = new Map<string, Promise<HintData>>();
async function getHints(companyId: string, instanceName: string, ids: string[]): Promise<HintData> {
  const key = JSON.stringify([companyId, instanceName, [...ids].sort()]);
  const cached = hintCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  if (hintPending.has(key)) return hintPending.get(key)!;
  const task = (async () => {
    const [links, names] = await Promise.all([
      prisma.$queryRawUnsafe<Array<IdentityLink & { customerId: string }>>(`
        SELECT DISTINCT "customerId", "rawPayload"#>>'{key,remoteJid}' AS principal,
          "rawPayload"#>>'{key,remoteJidAlt}' AS alternativo
        FROM m1m_messages WHERE "companyId"=$1 AND "instanceName"=$2
          AND "customerId"=ANY($3::text[])
          AND "rawPayload"#>>'{key,remoteJidAlt}' IS NOT NULL`, companyId, instanceName, ids),
      prisma.$queryRawUnsafe<Array<IdentityLink & { customerId: string; name: string | null }>>(`
        SELECT DISTINCT ON ("customerId") "customerId", "rawPayload"->>'pushName' AS name,
          "rawPayload"#>>'{key,remoteJid}' AS principal, "rawPayload"#>>'{key,remoteJidAlt}' AS alternativo
        FROM m1m_messages WHERE "companyId"=$1 AND "instanceName"=$2
          AND "customerId"=ANY($3::text[]) AND NOT "fromMe"
          AND length(trim(coalesce("rawPayload"->>'pushName','')))>0
          AND "rawPayload"->>'pushName' ~ '[A-Za-zÀ-ÿ].*[A-Za-zÀ-ÿ]'
          AND "rawPayload"->>'pushName' !~ '@(lid|s[.]whatsapp[.]net|g[.]us|newsletter)'
          AND lower(trim("rawPayload"->>'pushName')) NOT IN ('você','voce','contato','participante','cliente sem identificação')
        ORDER BY "customerId", "sentAt" DESC, id DESC`, companyId, instanceName, ids),
    ]);
    const data = { links, names };
    hintCache.set(key, { data, expiresAt: Date.now() + 15000 });
    while (hintCache.size > 100) hintCache.delete(hintCache.keys().next().value!);
    return data;
  })();
  hintPending.set(key, task);
  try { return await task; } finally { hintPending.delete(key); }
}

export async function enrichCustomerDisplayIdentities<T extends IdentityCustomer>(companyId: string, customers: T[], options: { allowHistoryDiscovery?: boolean } = {}) {
  if (!customers.length) return [];
  const company = await companyRepository.findById(companyId);
  const instanceName = company?.whatsappInstanceName?.trim();
  if (!instanceName) return customers.map(customer => presentCustomerIdentity({ ...customer, alternativeRemoteJid: null }));
  const base = process.env.EVOLUTION_API_URL || '', apiKey = process.env.EVOLUTION_API_KEY || '';
  const ids = customers.map(customer => customer.id);
  const contactsTask = getContacts(companyId, instanceName, base, apiKey);
  const { links, names } = await getHints(companyId, instanceName, ids);
  const linksByCustomer = new Map<string, IdentityLink[]>();
  for (const link of links) {
    if (!linksByCustomer.has(link.customerId)) linksByCustomer.set(link.customerId, []);
    linksByCustomer.get(link.customerId)!.push(link);
  }
  const namesByCustomer = new Map(names.map(row => [row.customerId, row]));
  // The legacy repository preview can come from another historical instance.
  // Rebuild aliases exclusively from the scoped evidence above.
  const seeds = customers.map(customer => {
    const scoped = { ...customer, alternativeRemoteJid: null };
    return { ...scoped, canonicalJid: confirmedCustomerPhone(scoped, {
      links: linksByCustomer.get(customer.id),
    }) || customer.remoteJid };
  });
  const [contacts, resolved] = await Promise.all([
    contactsTask, resolveChatHistoryIdentities(seeds, { companyId, instanceName, apiUrl: base, apiKey, allowDiscovery: options.allowHistoryDiscovery }),
  ]);
  return resolved.map(customer => {
    const hint = namesByCustomer.get(customer.id);
    const primary = normalizeIdentityJid(hint?.principal), alternate = normalizeIdentityJid(hint?.alternativo);
    const expected = [normalizeIdentityJid(customer.remoteJid), normalizeIdentityJid(customer.canonicalJid)];
    const receivedName = hint && !primary.endsWith('@g.us') && !primary.endsWith('@newsletter') &&
      [primary, alternate].some(jid => jid && expected.includes(jid)) ? usefulIdentityName(hint.name) : null;
    return presentCustomerIdentity(customer, {
      contacts, links: linksByCustomer.get(customer.id), receivedName, canonicalJid: customer.canonicalJid,
    });
  });
}
