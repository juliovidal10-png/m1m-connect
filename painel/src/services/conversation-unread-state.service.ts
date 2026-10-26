import { prisma } from "@/lib/prisma";

/**
 * TF3-A — infraestrutura do ledger. Ainda NÃO integrada ao webhook nem aos badges.
 * O caller deve resolver JID/LID na origem antes de chamar esta função.
 */
export type IncomingUnreadEvent = {
  companyId: string;
  instanceName: string;
  canonicalJid: string;
  evolutionMessageId: string;
  receivedAt: Date;
};

export async function recordIncomingUnreadEvent(event: IncomingUnreadEvent) {
  const { companyId, instanceName, canonicalJid, evolutionMessageId, receivedAt } = event;
  if (![companyId, instanceName, canonicalJid, evolutionMessageId].every((value) => value.trim().length > 0) || !Number.isFinite(receivedAt.getTime())) {
    throw new Error("TF3-A: evento de entrada invalido");
  }

  return prisma.$transaction(async (tx) => {
    const state = await tx.m1MConversationState.upsert({
      where: { companyId_instanceName_canonicalJid: { companyId, instanceName, canonicalJid } },
      create: { companyId, instanceName, canonicalJid },
      update: {},
    });

    // Duplicatas de webhook nao podem aumentar o contador.
    const inserted = await tx.m1MConversationUnreadMessage.createMany({
      data: [{ companyId, instanceName, evolutionMessageId, conversationStateId: state.id, receivedAt }],
      skipDuplicates: true,
    });
    if (inserted.count === 0) return { inserted: false, stateId: state.id };

    // Mensagem antiga apos exclusao: registrar no ledger, mas nao reabrir.
    // Mesmo timestamp e tratado conservadoramente como nao comprovadamente novo.
    const canReactivate = state.hiddenAt !== null &&
      state.hiddenThroughAt !== null && receivedAt.getTime() > state.hiddenThroughAt.getTime();
    const remainsHidden = state.hiddenAt !== null && !canReactivate;
    if (remainsHidden) return { inserted: true, stateId: state.id, hidden: true };

    // Atualizacao atomica: nao perde incrementos em webhooks concorrentes.
    await tx.m1MConversationState.update({
      where: { id: state.id },
      data: {
        unreadCount: { increment: 1 },
        revision: { increment: 1 },
        ...(canReactivate ? { hiddenAt: null, hiddenThroughAt: null, hiddenThroughMessageId: null } : {}),
        ...(state.lastIncomingAt === null || receivedAt > state.lastIncomingAt
          ? { lastIncomingAt: receivedAt, lastIncomingMessageId: evolutionMessageId }
          : {}),
      },
    });
    return { inserted: true, stateId: state.id, hidden: false, reactivated: canReactivate };
  });
}

/** Leitura global do ledger, sem depender da pagina atual do frontend. */
export async function countUnreadConversations(companyId: string, instanceName: string) {
  return prisma.m1MConversationState.count({
    where: { companyId, instanceName, hiddenAt: null, unreadCount: { gt: 0 } },
  });
}
