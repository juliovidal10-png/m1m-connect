export type IdentityCustomer = {
  id: string; remoteJid: string; name?: string | null; phone?: string | null;
  nameManuallySet?: boolean; alternativeRemoteJid?: string | null;
  displayName?: string | null; profilePicUrl?: string | null;
};
export type IdentityContact = {
  remoteJid?: string | null; pushName?: string | null;
  profilePicUrl?: string | null; isSaved?: boolean;
};
export type IdentityLink = { principal: string | null; alternativo: string | null };
export type IdentityEvidence = {
  contacts?: IdentityContact[]; links?: IdentityLink[];
  receivedName?: string | null; canonicalJid?: string | null;
};
export const normalizeIdentityJid = (value?: string | null) => value?.trim().toLowerCase() || '';
export const isPhoneIdentity = (jid: string) => /^\d{8,15}@s\.whatsapp\.net$/.test(jid);

export function usefulIdentityName(value?: string | null): string | null {
  const name = value?.trim() || '';
  if (!name || /@(?:lid|s\.whatsapp\.net|g\.us|newsletter)\b/i.test(name) ||
      /^(?:voc[eê]|contato|cliente sem identifica[cç][aã]o|participante)$/i.test(name)) return null;
  const letters = name.match(/\p{L}/gu)?.length || 0;
  const digits = name.replace(/\D/g, '').length;
  return letters >= 2 && !(digits >= 8 && digits >= name.replace(/\s/g, '').length * .65) ? name : null;
}

export function confirmedCustomerPhone(customer: Pick<IdentityCustomer, 'remoteJid' | 'phone' | 'alternativeRemoteJid'>, evidence: IdentityEvidence = {}): string | null {
  const jid = normalizeIdentityJid(customer.remoteJid);
  if (jid.endsWith('@g.us') || jid.endsWith('@newsletter')) return null;
  const phones = new Set<string>();
  if (isPhoneIdentity(jid)) phones.add(jid);
  const lid = /^\d+@lid$/.test(jid) ? jid : null;
  for (const candidate of [customer.alternativeRemoteJid, evidence.canonicalJid]) {
    const normalized = normalizeIdentityJid(candidate);
    if (isPhoneIdentity(normalized)) phones.add(normalized);
  }
  for (const link of evidence.links || []) {
    const primary = normalizeIdentityJid(link.principal), alternate = normalizeIdentityJid(link.alternativo);
    if (lid && primary === lid && isPhoneIdentity(alternate)) phones.add(alternate);
    if (lid && alternate === lid && isPhoneIdentity(primary)) phones.add(primary);
  }
  const stored = customer.phone?.trim().replace(/[+\s().-]/g, '') || '';
  const knownLids = [jid, normalizeIdentityJid(customer.alternativeRemoteJid), normalizeIdentityJid(evidence.canonicalJid),
    ...(evidence.links || []).flatMap(link => [normalizeIdentityJid(link.principal), normalizeIdentityJid(link.alternativo)])]
    .filter(value => /^\d+@lid$/.test(value)).map(value => value.split('@')[0]);
  if (/^\d{8,15}$/.test(stored) && !knownLids.includes(stored)) {
    // A saved local Brazilian format may omit 55. Match it to an already
    // confirmed JID; never invent a country code for an unresolved identity.
    const equivalent = [...phones].find(value => {
      const digits = value.split('@')[0];
      return digits === stored || (digits.startsWith('55') && [12, 13].includes(digits.length) && digits.slice(2) === stored);
    });
    phones.add(equivalent || `${stored}@s.whatsapp.net`);
  }
  return phones.size === 1 ? [...phones][0] : null;
}

export function formatConfirmedPhone(jid: string | null): string | null {
  if (!jid || !isPhoneIdentity(jid)) return null;
  const digits = jid.split('@')[0];
  const local = digits.startsWith('55') && [12, 13].includes(digits.length) ? digits.slice(2) : null;
  if (local?.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local?.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return `+${digits}`;
}

function usablePhoto(value?: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? value : null; }
  catch { return null; }
}

export function presentCustomerIdentity<T extends IdentityCustomer>(customer: T, evidence: IdentityEvidence = {}) {
  const jid = normalizeIdentityJid(customer.remoteJid);
  const group = jid.endsWith('@g.us'), channel = jid.endsWith('@newsletter');
  const phoneJid = confirmedCustomerPhone(customer, evidence);
  const exact = (evidence.contacts || []).filter(contact => normalizeIdentityJid(contact.remoteJid) === jid);
  const aliases = phoneJid && phoneJid !== jid ? (evidence.contacts || [])
    .filter(contact => normalizeIdentityJid(contact.remoteJid) === phoneJid) : [];
  const contacts = [...aliases, ...exact].sort((a, b) => Number(Boolean(b.isSaved)) - Number(Boolean(a.isSaved)));
  const contactName = contacts.map(contact => usefulIdentityName(contact.pushName)).find(Boolean) || null;
  const displayPhone = formatConfirmedPhone(phoneJid);
  const displayName = usefulIdentityName(customer.name) || contactName ||
    (!group && !channel ? usefulIdentityName(evidence.receivedName) : null) ||
    (group ? usefulIdentityName(customer.displayName) || 'Grupo do WhatsApp' :
      channel ? usefulIdentityName(customer.displayName) || 'Canal do WhatsApp' : displayPhone || 'Cliente sem identificação');
  const profilePicUrl = contacts.map(contact => usablePhoto(contact.profilePicUrl)).find(Boolean) || usablePhoto(customer.profilePicUrl);
  return { ...customer, displayName, displayPhone, profilePicUrl: profilePicUrl || null,
    canonicalJid: phoneJid || jid, isGroup: group };
}
