import { prisma } from "@/lib/prisma";
import { pendingUnreadSnapshot, type LedgerUnreadSnapshot } from "@/lib/conversation-unread-snapshot";

/** Aplicar somente depois da visibilidade por empresa/setor; antes de paginar. */
export async function projectLedgerUnreadStates<T extends { canonicalJid?: string | null }>(
  companyId: string, instanceName: string, chats: T[],
): Promise<Array<T & LedgerUnreadSnapshot>> {
  if (!companyId.trim() || !instanceName.trim()) throw new Error("Escopo de contagem invalido");
  const canonicalJids = [...new Set(chats.map(chat => chat.canonicalJid).filter((jid): jid is string => typeof jid === "string" && jid.length > 0))];
  const states = canonicalJids.length ? await prisma.m1MConversationState.findMany({
    where: { companyId, instanceName, canonicalJid: { in: canonicalJids } },
    select: { canonicalJid: true, unreadCount: true, revision: true, hiddenAt: true },
  }) : [];
  const requestedJids = new Set(canonicalJids);
  const byJid = new Map<string, (typeof states)[number]>();
  for (const state of states) {
    if (!requestedJids.has(state.canonicalJid) || byJid.has(state.canonicalJid) ||
      !Number.isSafeInteger(state.unreadCount) || state.unreadCount < 0 ||
      !Number.isSafeInteger(state.revision) || state.revision < 0) throw new Error("Estado de contagem inconsistente");
    byJid.set(state.canonicalJid, state);
  }
  return chats.flatMap(chat => {
    const canonicalJid = chat.canonicalJid || null;
    const state = canonicalJid ? byJid.get(canonicalJid) : undefined;
    if (state?.hiddenAt) return [];
    if (!state) return [{ ...chat, ...pendingUnreadSnapshot(canonicalJid) }];
    return [{ ...chat, unreadSource: "LEDGER" as const, unreadCount: state.unreadCount,
      unreadRevision: state.revision, unreadCanonicalJid: state.canonicalJid }];
  });
}
