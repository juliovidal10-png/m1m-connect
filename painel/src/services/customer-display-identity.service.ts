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

const photoCache = new Map<string, { expiresAt: number; url: string | null }>();
const photoPending = new Map<string, Promise<string | null>>();
async function getConfirmedPhoto(companyId: string, instanceName: string, base: string, apiKey: string, phone: string) {
  const key = JSON.stringify([base, companyId, instanceName, phone]);
  const cached = photoCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (photoPending.has(key)) return photoPending.get(key)!;
  const task = (async () => {
    let url: string | null = null;
    try {
      const response = await fetch(`${base.replace(/\/+$/, '')}/chat/fetchProfilePictureUrl/${encodeURIComponent(instanceName)}`, {
        method: 'POST', headers: { apikey: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: phone.split('@')[0] }), cache: 'no-store', signal: AbortSignal.timeout(2500),
      });
      const data = response.ok ? await response.json() : null;
      if (normalizeIdentityJid(data?.wuid) === phone && typeof data?.profilePictureUrl === 'string' &&
        /^https?:\/\//i.test(data.profilePictureUrl)) url = data.profilePictureUrl;
    } catch { /* A private/unavailable photo must not hide the confirmed phone. */ }
    photoCache.set(key, { url, expiresAt: Date.now() + (url ? 300000 : 60000) });
    while (photoCache.size > 2000) photoCache.delete(photoCache.keys().next().value!);
    return url;
  })();
  photoPending.set(key, task);
  try { return await task; } finally { photoPending.delete(key); }
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

export async function enrichCustomerDisplayIdentities<T extends IdentityCustomer>(companyId: string, customers: T[], options: { allowHistoryDiscovery?: boolean; deferProvider?: (task: Promise<unknown>) => void } = {}) {
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
  const scope = { companyId, instanceName, apiUrl: base, apiKey, allowDiscovery: options.allowHistoryDiscovery };
  function present(resolved: typeof seeds, contacts: IdentityContact[]) {
    const contactsByJid = new Map<string, IdentityContact[]>();
    for (const contact of contacts) {
      const jid = normalizeIdentityJid(contact.remoteJid);
      const matches = contactsByJid.get(jid);
      if (matches) matches.push(contact);
      else contactsByJid.set(jid, [contact]);
    }
    return resolved.map(customer => {
      const hint = namesByCustomer.get(customer.id);
      const primary = normalizeIdentityJid(hint?.principal), alternate = normalizeIdentityJid(hint?.alternativo);
      const remote = normalizeIdentityJid(customer.remoteJid);
      const canonical = normalizeIdentityJid(customer.canonicalJid);
      const expected = [remote, canonical];
      const receivedName = hint && !primary.endsWith('@g.us') && !primary.endsWith('@newsletter') &&
        [primary, alternate].some(jid => jid && expected.includes(jid)) ? usefulIdentityName(hint.name) : null;
      const matchingContacts = [...(contactsByJid.get(remote) || []),
        ...(canonical === remote ? [] : contactsByJid.get(canonical) || [])];
      return presentCustomerIdentity(customer, {
        contacts: matchingContacts, links: linksByCustomer.get(customer.id), receivedName, canonicalJid: customer.canonicalJid,
      });
    });
  }

  function withCachedPhoto(customer: ReturnType<typeof present>[number]) {
    if (customer.profilePicUrl) return customer;
    const photo = photoCache.get(JSON.stringify([base, companyId, instanceName, customer.canonicalJid]));
    return photo?.url && photo.expiresAt > Date.now() ? { ...customer, profilePicUrl: photo.url } : customer;
  }

  const live = Promise.all([resolveChatHistoryIdentities(seeds, scope), contactsTask])
    .then(([resolved, contacts]) => present(resolved, contacts));

  if (options.deferProvider) {
    // List requests can use the saved data while the provider refreshes its scoped caches.
    // The customer detail still waits for live identity and photo lookup.
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const ready = await Promise.race([
        live,
        new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 350); }),
      ]);
      if (ready) return ready.map(withCachedPhoto);
    } finally {
      clearTimeout(timer);
    }

    options.deferProvider(live.catch(() => {}));
    const resolved = await resolveChatHistoryIdentities(seeds, { ...scope, allowDiscovery: false });
    const cached = contactCache.get(JSON.stringify([base, companyId, instanceName]));
    return present(resolved, cached?.contacts || []).map(withCachedPhoto);
  }

  const presented = await live;
  // Fetch only exact confirmed identities; bound new requests per page and share polling work.
  let budget = 4;
  return Promise.all(presented.map(async customer => {
    const phone = customer.canonicalJid;
    if (customer.profilePicUrl ||
      !base || !apiKey || !/^\d{8,15}@s\.whatsapp\.net$/.test(phone || '')) return customer;
    const key = JSON.stringify([base, companyId, instanceName, phone]);
    const cached = photoCache.get(key);
    if (!(cached && cached.expiresAt > Date.now()) && !photoPending.has(key) && budget-- <= 0) return customer;
    const url = await getConfirmedPhoto(companyId, instanceName, base, apiKey, phone!);
    return url ? { ...customer, profilePicUrl: url } : customer;
  }));
}
