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

async function retrySerialization<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await fn(); }
    catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code !== "P2034" || attempt === 2) throw error;
    }
  }
  throw new Error("TF3-A: conflito de transacao");
}

export async function recordIncomingUnreadEvent(event: IncomingUnreadEvent) {
  const { companyId, instanceName, canonicalJid, evolutionMessageId, receivedAt } = event;
  if (![companyId, instanceName, canonicalJid, evolutionMessageId].every((value) => value.trim().length > 0) || !Number.isFinite(receivedAt.getTime())) {
    throw new Error("TF3-A: evento de entrada invalido");
  }

  return retrySerialization(() => prisma.$transaction(async (tx) => {
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
    // Uma data enviada pela origem nao comprova a ordem de entrega.
    // Reativacao fica bloqueada ate existir sequenciamento confiavel de eventos.
    const canReactivate = false;
    const remainsHidden = state.hiddenAt !== null && !canReactivate;
    if (remainsHidden) {
      await tx.m1MConversationUnreadMessage.updateMany({
        where: { companyId, instanceName, evolutionMessageId, conversationStateId: state.id },
        data: { readAt: new Date() },
      });
      return { inserted: true, stateId: state.id, hidden: true };
    }

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
  }, { isolationLevel: "Serializable" }));
}

/** Leitura global do ledger, sem depender da pagina atual do frontend. */
export async function countUnreadConversations(companyId: string, instanceName: string) {
  return prisma.m1MConversationState.count({
    where: { companyId, instanceName, hiddenAt: null, unreadCount: { gt: 0 } },
  });
}

/**
 * Aplica somente IDs de mensagens cujo READ/PLAYED ja foi comprovado na origem.
 * O chamador deve validar empresa, identidade, permissao e recibos na Evolution.
 * IDs nao encontrados ou de outra conversa nao alteram o contador.
 * O isolamento transacional SERIALIZABLE protege a contagem contra novas entradas.
 */
export async function recordConfirmedRead(input: {
  companyId: string;
  instanceName: string;
  canonicalJid: string;
  confirmedEvolutionMessageIds: string[];
}) {
  const { companyId, instanceName, canonicalJid } = input;
  const ids = [...new Set(input.confirmedEvolutionMessageIds)];
  if (![companyId, instanceName, canonicalJid].every((value) => value.trim()) ||
      ids.length === 0 || ids.length > 100 || ids.some((id) => !id.trim())) {
    throw new Error("TF3-A: confirmacao de leitura invalida");
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const state = await tx.m1MConversationState.findUnique({
          where: { companyId_instanceName_canonicalJid: { companyId, instanceName, canonicalJid } },
        });
        if (!state) return { confirmed: 0, remaining: 0, stateFound: false };

        const unread = await tx.m1MConversationUnreadMessage.findMany({
          where: {
            companyId, instanceName, conversationStateId: state.id,
            evolutionMessageId: { in: ids }, readAt: null,
          },
          select: { id: true },
        });
        const confirmed = await tx.m1MConversationUnreadMessage.updateMany({
          where: { id: { in: unread.map((message) => message.id) }, readAt: null },
          data: { readAt: new Date() },
        });
        const remaining = await tx.m1MConversationUnreadMessage.count({
          where: { conversationStateId: state.id, readAt: null },
        });
        await tx.m1MConversationState.update({
          where: { id: state.id },
          data: { unreadCount: remaining, revision: { increment: 1 },
            ...(remaining === 0 ? { lastReadAt: new Date(), lastReadMessageId: ids[ids.length - 1] } : {}),
          },
        });
        return { confirmed: confirmed.count, remaining, stateFound: true };
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code !== "P2034" || attempt === 2) throw error;
    }
  }
  throw new Error("TF3-A: leitura nao persistida");
}

/**
 * Exclusao logica do estado da conversa. Nao remove mensagens, CRM ou financeiro.
 * O chamador deve comprovar permissao e identidade antes de invocar.
 * Reativacao por evento posterior permanece bloqueada ate sequenciamento validado.
 */
export async function hideConversationState(input: {
  companyId: string;
  instanceName: string;
  canonicalJid: string;
}) {
  const { companyId, instanceName, canonicalJid } = input;
  if (![companyId, instanceName, canonicalJid].every((value) => value.trim())) {
    throw new Error("TF3-A: identidade de conversa invalida");
  }
  return retrySerialization(() => prisma.$transaction(async (tx) => {
    const state = await tx.m1MConversationState.upsert({
      where: { companyId_instanceName_canonicalJid: { companyId, instanceName, canonicalJid } },
      create: { companyId, instanceName, canonicalJid },
      update: {},
    });
    const now = new Date();
    await tx.m1MConversationUnreadMessage.updateMany({
      where: { conversationStateId: state.id, readAt: null },
      data: { readAt: now },
    });
    await tx.m1MConversationState.update({
      where: { id: state.id },
      data: {
        hiddenAt: now,
        hiddenThroughAt: state.lastIncomingAt ?? now,
        hiddenThroughMessageId: state.lastIncomingMessageId,
        unreadCount: 0,
        revision: { increment: 1 },
      },
    });
    return { hidden: true, stateId: state.id };
  }, { isolationLevel: "Serializable" }));
}
