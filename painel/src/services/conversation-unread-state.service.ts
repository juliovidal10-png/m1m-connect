import { prisma } from "@/lib/prisma";

/**
 * TF3-A — infraestrutura opt-in do ledger; badges ainda nao integrados.
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

    // Ocultacao nao confirma leitura. Preservar readAt ate recibo READ/PLAYED.
    // Reativacao permanece bloqueada ate origem/sequenciamento validado.
    const canReactivate = false;
    const remainsHidden = state.hiddenAt !== null && !canReactivate;
    if (remainsHidden) {
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
  // Evidencia obtida pelo caller na Evolution, nunca diretamente do navegador.
  confirmedMessages?: { evolutionMessageId: string; receivedAt: Date }[];
}) {
  const { companyId, instanceName, canonicalJid } = input;
  const ids = [...new Set(input.confirmedEvolutionMessageIds)];
  const evidence = input.confirmedMessages ?? [];
  if (![companyId, instanceName, canonicalJid].every((value) => value.trim()) ||
      ids.length === 0 || ids.length > 100 || ids.some((id) => !id.trim())) {
    throw new Error("TF3-A: confirmacao de leitura invalida");
  }
  if (evidence.length > ids.length ||
      new Set(evidence.map((message) => message.evolutionMessageId)).size !== evidence.length ||
      evidence.some((message) => !ids.includes(message.evolutionMessageId) ||
        !Number.isFinite(message.receivedAt.getTime()))) {
    throw new Error("TF3-A: evidencia de leitura invalida");
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        // O historico e persistido antes do ledger. Uma leitura pode chegar
        // nesse intervalo; guardar o recibo com a data original ja persistida.
        const stored = await tx.m1MMessage.findMany({
          where: {
            companyId, instanceName, evolutionMessageId: { in: ids },
            fromMe: false, direction: "IN",
            customer: { companyId, remoteJid: canonicalJid },
          },
          select: { evolutionMessageId: true, sentAt: true },
        });
        const seedMessages = new Map(stored.map((message) => [message.evolutionMessageId, message.sentAt]));
        const missing = evidence.filter((message) => !seedMessages.has(message.evolutionMessageId));
        if (missing.length > 0) {
          // Nao criar estado alternativo se o mesmo ID ja pertence a outro
          // cliente/direcao no historico local desta empresa e instancia.
          const conflicts = await tx.m1MMessage.findMany({
            where: { companyId, instanceName, evolutionMessageId: { in: missing.map((message) => message.evolutionMessageId) } },
            select: { evolutionMessageId: true },
          });
          if (conflicts.length > 0) throw new Error("TF3-A: identidade persistida diverge do recibo");
          for (const message of missing) seedMessages.set(message.evolutionMessageId, message.receivedAt);
        }
        let state = await tx.m1MConversationState.findUnique({
          where: { companyId_instanceName_canonicalJid: { companyId, instanceName, canonicalJid } },
        });
        if (!state && seedMessages.size === 0) return {
          confirmed: 0, remaining: 0, stateFound: false,
          persistedReadCount: 0, unresolvedReadCount: ids.length,
        };
        if (!state) {
          state = await tx.m1MConversationState.upsert({
            where: { companyId_instanceName_canonicalJid: { companyId, instanceName, canonicalJid } },
            create: { companyId, instanceName, canonicalJid }, update: {},
          });
        }
        const readAt = new Date();
        const stateId = state.id;
        const seeded = seedMessages.size === 0 ? { count: 0 } : await tx.m1MConversationUnreadMessage.createMany({
          data: [...seedMessages].map(([evolutionMessageId, receivedAt]) => ({
            companyId, instanceName, evolutionMessageId,
            conversationStateId: stateId, receivedAt, readAt,
          })),
          skipDuplicates: true,
        });

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
          data: { unreadCount: state.hiddenAt === null ? remaining : 0, revision: { increment: 1 },
            ...(remaining === 0 ? { lastReadAt: new Date(), lastReadMessageId: ids[ids.length - 1] } : {}),
          },
        });
        const persistedReadCount = await tx.m1MConversationUnreadMessage.count({
          where: { companyId, instanceName, conversationStateId: state.id,
            evolutionMessageId: { in: ids }, readAt: { not: null } },
        });
        return { confirmed: confirmed.count + seeded.count, remaining, stateFound: true,
          persistedReadCount, unresolvedReadCount: ids.length - persistedReadCount };
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
    // Retirar da caixa de entrada nao equivale a ler mensagens na origem.
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
