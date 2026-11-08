type IdentityChat = {
  remoteJid?: string | null;
  canonicalJid?: string | null;
  lastMessage?: { key?: { remoteJid?: string | null; remoteJidAlt?: string | null } | null } | null;
};
type Scope = { companyId: string; instanceName: string; apiUrl: string; apiKey: string; allowDiscovery?: boolean };
type Entry = { expiresAt: number; phone: string | null };
const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<string | null>>();
const normalize = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const isPhone = (jid: string) => /^\d+@s\.whatsapp\.net$/.test(jid);
const isLid = (jid: string) => /^\d+@lid$/.test(jid);
const identities = (chat: IdentityChat) => [chat.remoteJid, chat.canonicalJid,
  chat.lastMessage?.key?.remoteJid, chat.lastMessage?.key?.remoteJidAlt].map(normalize);

function cacheKey(scope: Scope, lid: string) {
  return JSON.stringify([scope.apiUrl, scope.companyId, scope.instanceName, lid]);
}

// Session mappings are independent of message history: old messages can lack remoteJidAlt.
const sessionCache = new Map<string, Entry>();
const sessionPending = new Map<string, Promise<void>>();
async function resolveSessionLinks(scope: Scope, lids: string[]) {
  const missing = lids.filter(lid => (sessionCache.get(cacheKey(scope, lid))?.expiresAt || 0) <= Date.now()).slice(0, 100);
  if (scope.allowDiscovery !== false && missing.length) {
    const batchKey = JSON.stringify([scope.apiUrl, scope.companyId, scope.instanceName, [...missing].sort()]);
    if (!sessionPending.has(batchKey)) {
      const task = (async () => {
        let valid = false;
        const candidates = new Map<string, Set<string>>();
        try {
          const response = await fetch(`${scope.apiUrl.replace(/\/+$/, '')}/baileys/onWhatsapp/${encodeURIComponent(scope.instanceName)}`, {
            method: 'POST', headers: { apikey: scope.apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ jid: { m1mIdentityLookup: { version: 1, phones: [], lids: missing } } }),
            cache: 'no-store', signal: AbortSignal.timeout(2500),
          });
          const data = response.ok ? await response.json() : null;
          if (data?.m1mIdentityLookup === 1 && Array.isArray(data.mappings) && data.mappings.length <= 120) {
            valid = true;
            for (const pair of data.mappings) {
              const lid = normalize(pair?.lid), phone = normalize(pair?.pn);
              if (!missing.includes(lid) || !/^\d{8,15}@s\.whatsapp\.net$/.test(phone)) continue;
              if (!candidates.has(lid)) candidates.set(lid, new Set());
              candidates.get(lid)!.add(phone);
            }
          }
        } catch { /* Older providers and temporary outages retain history fallback. */ }
        for (const lid of missing) {
          const key = cacheKey(scope, lid), phones = candidates.get(lid);
          const previous = sessionCache.get(key)?.phone;
          const phone = phones?.size === 1 ? [...phones][0] : phones && phones.size > 1 ? null : previous || null;
          sessionCache.set(key, { phone, expiresAt: Date.now() + (phone ? 300000 : valid ? 60000 : 15000) });
        }
        while (sessionCache.size > 2000) sessionCache.delete(sessionCache.keys().next().value!);
      })();
      sessionPending.set(batchKey, task);
    }
    try { await sessionPending.get(batchKey); } finally { sessionPending.delete(batchKey); }
  }
  return new Map(lids.map(lid => [lid, sessionCache.get(cacheKey(scope, lid))?.phone || null]));
}

async function lookup(scope: Scope, lid: string): Promise<string | null> {
  const key = cacheKey(scope, lid);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.phone;
  if (pending.has(key)) return pending.get(key)!;
  const task = (async () => {
    let phone: string | null = null;
    let successful = false;
    let contradictory = false;
    try {
      const response = await fetch(`${scope.apiUrl.replace(/\/+$/, '')}/chat/findMessages/${encodeURIComponent(scope.instanceName)}`, {
        method: 'POST', headers: { apikey: scope.apiKey, 'Content-Type': 'application/json' },
        // Both filters avoid Evolution versions treating the missing OR branch as {}.
        body: JSON.stringify({ where: { key: { remoteJid: lid, remoteJidAlt: lid } }, page: 1, offset: 100 }),
        cache: 'no-store', signal: AbortSignal.timeout(2500),
      });
      if (response.ok) {
        const data = await response.json();
        const rows = data?.messages?.records;
        if (Array.isArray(rows) && rows.length <= 100) {
          const phones = new Set<string>();
          let valid = true;
          // Repeated WhatsApp key.id values are legitimate duplicate stored rows.
          // Inspect every row; do not stop at the first repeated message ID.
          for (const row of rows) {
            const primary = normalize(row?.key?.remoteJid);
            const alternate = normalize(row?.key?.remoteJidAlt);
            if (primary !== lid && alternate !== lid) { valid = false; break; }
            const other = primary === lid ? alternate : primary;
            if (isPhone(other)) phones.add(other);
          }
          successful = valid;
          contradictory = valid && phones.size > 1;
          if (valid && phones.size === 1) phone = [...phones][0];
        }
      }
    } catch { /* A provider failure must preserve existing conversations. */ }
    // A rolling 100-row sample (or an outage) may no longer contain the
    // previously confirmed link. Keep it unless observed evidence conflicts.
    if (!phone && !contradictory && cached?.phone) phone = cached.phone;
    // Never interpret a bounded sample with no link as proof of distinct people.
    cache.set(key, { phone, expiresAt: Date.now() + (phone ? 300000 : successful ? 60000 : 15000) });
    while (cache.size > 2000) cache.delete(cache.keys().next().value!);
    return phone;
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}

export async function resolveChatHistoryIdentities<T extends IdentityChat>(
  chats: T[], scope: Scope,
): Promise<T[]> {
  if (!scope.apiUrl || !scope.apiKey) return chats;
  const links = new Map<string, Set<string>>();
  const unresolved = new Set<string>();
  for (const chat of chats) {
    if (normalize(chat.remoteJid).endsWith('@g.us') || normalize(chat.remoteJid).endsWith('@newsletter')) continue;
    const ids = identities(chat);
    const phones = ids.filter(isPhone);
    for (const lid of ids.filter(isLid)) {
      if (!links.has(lid)) links.set(lid, new Set());
      for (const phone of phones) links.get(lid)!.add(phone);
      if (!phones.length) unresolved.add(lid);
    }
  }
  const sessionLinks = await resolveSessionLinks(scope, [...unresolved]);
  for (const [lid, phone] of sessionLinks) {
    if (phone) links.get(lid)!.add(phone);
  }
  // Bounded discovery, shared in-flight work, and tenant-scoped caching keep
  // polling from issuing one history request per conversation on every refresh.
  const missing: string[] = [];
  for (const lid of unresolved) {
    if (links.get(lid)!.size) continue;
    const key = cacheKey(scope, lid);
    const entry = cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      if (entry.phone) links.get(lid)!.add(entry.phone);
    } else if (scope.allowDiscovery !== false && (pending.has(key) || missing.length < 4)) missing.push(lid);
  }
  await Promise.all(missing.map(async lid => {
    const phone = await lookup(scope, lid);
    if (phone) links.get(lid)!.add(phone);
  }));
  return chats.map(chat => {
    if (!isLid(normalize(chat.remoteJid))) return chat;
    const phones = links.get(normalize(chat.remoteJid));
    if (!phones || phones.size !== 1) return chat;
    return { ...chat, canonicalJid: [...phones][0] };
  });
}
