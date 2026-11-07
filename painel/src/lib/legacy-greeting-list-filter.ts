export const legacyGreetingPrefix = 'Olá! Meu nome é Júlio Vidal e vou continuar seu atendimento por aqui.';
export const legacyGreetingStart = new Date('2026-10-29T00:00:00Z');
export const legacyGreetingEnd = new Date('2026-10-30T00:00:00Z');
export function legacyGreetingScope(companyId: string, instanceName: string) {
  return companyId === 'empresa-teste' && instanceName === 'M1MTesteIA';
}
type CustomerSnapshot = {
  id: string; companyId: string; remoteJid: string; name: string | null; phone: string | null;
  attendances: { id: string }[];
  messages: { companyId: string; instanceName: string | null; fromMe: boolean;
    type: string; content: string | null; sentAt: Date; evolutionMessageId: string | null }[];
};
type ChatSnapshot = {
  remoteJid?: string | null; canonicalJid?: string | null;
  crmCustomerId?: string | null; crmName?: string | null; pushName?: string | null;
  crmPhone?: string | null; updatedAt?: unknown;
  attendanceState?: string | null; attendanceResponsibleId?: string | null;
  lastMessage?: { pushName?: string | null; key?: { id?: string; fromMe?: boolean | null;
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
      if (row.companyId !== companyId || !/^\d+@lid$/.test(row.remoteJid) ||
          !anonymous(row.name) || row.phone?.trim() || row.attendances.length || !row.messages.length) continue;
      // Older conversation history is intentionally preserved and no longer
      // prevents this owner-requested list cleanup. Only the latest activity matters.
      const message = row.messages[0];
      const sentAt = message.sentAt.getTime();
      if (message.companyId !== companyId || message.instanceName !== instanceName || !message.fromMe || message.type !== 'TEXT' ||
          !message.evolutionMessageId || !message.content?.startsWith(legacyGreetingPrefix) ||
          !(sentAt >= legacyGreetingStart.getTime() && sentAt < legacyGreetingEnd.getTime())) continue;
      eligible.set(row.remoteJid, { customerId: row.id, messageId: message.evolutionMessageId, sentAt });
    }
  }
  // Reversible OPEN-list cleanup, not deletion. Search and direct history remain
  // available. New activity or a confirmed name/phone restores the conversation.
  return (chat: ChatSnapshot, search = '') => {
    if (search.trim()) return false;
    const item = eligible.get(chat.remoteJid || '');
    if (!item || chat.crmCustomerId !== item.customerId || chat.crmPhone?.trim() ||
        !anonymous(chat.crmName) || !anonymous(chat.pushName) || !anonymous(chat.lastMessage?.pushName) ||
        chat.attendanceResponsibleId || (chat.attendanceState != null && !['FINALIZADO', 'IA'].includes(chat.attendanceState))) return false;
    const key = chat.lastMessage?.key;
    if (key?.id !== item.messageId || key.fromMe !== true) return false;
    if ([chat.canonicalJid, key.remoteJid, key.remoteJidAlt].some(jid => jid && jid !== chat.remoteJid)) return false;
    const time = typeof chat.updatedAt === 'string' || typeof chat.updatedAt === 'number' || chat.updatedAt instanceof Date
      ? new Date(chat.updatedAt).getTime() : NaN;
    return time === item.sentAt;
  };
}
