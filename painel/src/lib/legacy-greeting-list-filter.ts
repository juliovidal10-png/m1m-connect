import { legacyGreetingManifest } from './legacy-greeting-manifest';

export function legacyGreetingScope(companyId: string, instanceName: string) {
  return companyId === 'empresa-teste' && instanceName === 'M1MTesteIA';
}
export function legacyGreetingCustomerIds(companyId: string, instanceName: string): string[] {
  return legacyGreetingScope(companyId, instanceName) ? legacyGreetingManifest.map(row => row.customerId) : [];
}
type CustomerSnapshot = {
  id: string; companyId: string; remoteJid: string; name: string | null;
  phone: string | null; nameManuallySet: boolean;
  company: string | null; city: string | null; observations: string | null;
  responsibleId: string | null; responsible: string | null;
  _count: { messages: number; reminders: number; paymentReceipts: number };
  attendances: { id: string }[];
  messages: { companyId: string; instanceName: string | null; fromMe: boolean;
    type: string; content: string | null; sentAt: Date; evolutionMessageId: string | null }[];
};
type ChatSnapshot = {
  id?: unknown; remoteJid?: string | null; canonicalJid?: string | null;
  crmCustomerId?: string | null; crmName?: string | null; pushName?: string | null;
  crmPhone?: string | null; updatedAt?: unknown;
  attendanceState?: string | null; attendanceResponsibleId?: string | null;
  lastMessage?: { key?: { id?: string; fromMe?: boolean | null;
    remoteJid?: string | null; remoteJidAlt?: string | null } | null } | null;
};
function anonymous(value: string | null | undefined) {
  const name = value?.trim() || '';
  return !name || /^(contato|voc[eê])$/i.test(name) || /^\d+(?:@lid)?$/.test(name);
}

export function createLegacyGreetingListFilter(
  companyId: string, instanceName: string, records: CustomerSnapshot[],
) {
  const eligible = new Map<string, { customerId: string; messageId: string; sentAt: number }>();
  if (legacyGreetingScope(companyId, instanceName)) {
    for (const row of records) {
      const manifest = legacyGreetingManifest.find(item => item.customerId === row.id && item.remoteJid === row.remoteJid);
      if (!manifest || row.companyId !== companyId || row.nameManuallySet || !anonymous(row.name) || row.phone?.trim()) continue;
      if ([row.company, row.city, row.observations, row.responsibleId, row.responsible].some(value => value?.trim())) continue;
      if (row._count.messages !== 1 || row.messages.length !== 1 || row._count.reminders || row._count.paymentReceipts || row.attendances.length) continue;
      const message = row.messages[0];
      if (message.companyId !== companyId || message.instanceName !== instanceName || !message.fromMe || message.type !== 'TEXT' ||
          !message.evolutionMessageId || !message.content?.startsWith('Olá! Meu nome é Júlio Vidal e vou continuar seu atendimento por aqui.') ||
          message.sentAt.getTime() !== Date.parse(manifest.sentAt)) continue;
      eligible.set(row.remoteJid, { customerId: row.id, messageId: message.evolutionMessageId, sentAt: message.sentAt.getTime() });
    }
  }
  // This is a reversible list-only exclusion. Search and direct history remain
  // available. Any new stored message, provider activity or confirmed identity
  // invalidates it. No customer, attendance, message or related record is deleted.
  return (chat: ChatSnapshot, search = '') => {
    if (search.trim()) return false;
    const item = eligible.get(chat.remoteJid || '');
    if (!item || chat.crmCustomerId !== item.customerId || chat.id != null || chat.crmPhone?.trim() ||
        !anonymous(chat.crmName) || !anonymous(chat.pushName) || chat.attendanceResponsibleId ||
        (chat.attendanceState != null && chat.attendanceState !== 'FINALIZADO')) return false;
    const key = chat.lastMessage?.key;
    if (key?.id !== item.messageId || key.fromMe !== true) return false;
    if ([chat.canonicalJid, key.remoteJid, key.remoteJidAlt].some(jid => jid && jid !== chat.remoteJid)) return false;
    const time = typeof chat.updatedAt === 'string' || typeof chat.updatedAt === 'number' || chat.updatedAt instanceof Date
      ? new Date(chat.updatedAt).getTime() : NaN;
    return time === item.sentAt;
  };
}
