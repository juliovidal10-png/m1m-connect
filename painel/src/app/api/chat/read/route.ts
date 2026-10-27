import { recordConfirmedRead } from "@/services/conversation-unread-state.service";
import { NextRequest, NextResponse } from "next/server";
import { authorizationService } from "@/services/auth/authorization.service";
import { companyRepository } from "@/repositories/company.repository";
import { prisma } from "@/lib/prisma";
import { M1MUserPermission } from "@/generated/prisma/enums";
import { getMessages } from "@/lib/evolution";

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const user = await authorizationService.getCurrentUser();
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Requisicao invalida" }, { status: 400 });
    const payload = body as { remoteJid?: unknown; messageIds?: unknown };
    const remoteJid = typeof payload.remoteJid === "string" ? payload.remoteJid.trim() : "";
    const ids = Array.isArray(payload.messageIds) ? payload.messageIds : [];
    if (!/^[0-9A-Za-z._:-]+@(s\.whatsapp\.net|lid|g\.us)$/.test(remoteJid) || ids.length < 1 || ids.length > 100 || ids.some((id) => typeof id !== "string" || id.length < 1 || id.length > 180)) {
      return NextResponse.json({ error: "Parametros invalidos" }, { status: 400 });
    }
    const company = await companyRepository.findById(user.companyId);
    const instance = company?.whatsappInstanceName?.trim();
    if (!instance || !API_URL || !API_KEY) return NextResponse.json({ error: "Instancia indisponivel" }, { status: 503 });

    // Os identificadores informados pelo navegador sao apenas candidatos.
    // Cada registro deve ser reencontrado na instancia e vinculado ao JID da conversa
    // pelo proprio remoteJid ou pelo remoteJidAlt persistido na mensagem.
    type EvolutionMessage = {
      key?: { id?: string; remoteJid?: string; remoteJidAlt?: string; fromMe?: boolean; participant?: string };
      status?: string | null;
      messageTimestamp?: number | string;
    };
    const requested = new Set(ids as string[]);
    if (requested.size !== ids.length) return NextResponse.json({ error: "IDs duplicados" }, { status: 400 });
    const rawKeys = (payload as { messageKeys?: unknown }).messageKeys;
    if (rawKeys !== undefined && (!Array.isArray(rawKeys) || rawKeys.length !== ids.length)) {
      return NextResponse.json({ error: "Chaves invalidas" }, { status: 400 });
    }
    const candidateJids = new Set<string>([remoteJid]);
    if (Array.isArray(rawKeys)) {
      for (const item of rawKeys) {
        if (!item || typeof item !== "object") return NextResponse.json({ error: "Chave invalida" }, { status: 400 });
        const key = item as { id?: unknown; remoteJid?: unknown };
        if (typeof key.id !== "string" || !requested.has(key.id) ||
            typeof key.remoteJid !== "string" ||
            !/^[0-9A-Za-z._:-]+@(s\.whatsapp\.net|lid|g\.us)$/.test(key.remoteJid)) {
          return NextResponse.json({ error: "Chave invalida" }, { status: 400 });
        }
        candidateJids.add(key.remoteJid);
      }
    }
    if (candidateJids.size > 2) return NextResponse.json({ error: "Identidades ambiguas" }, { status: 409 });
    const isConfirmedReadStatus = (status: string | null | undefined) => status === "READ" || status === "PLAYED";
    const byId = new Map<string, EvolutionMessage>();
    for (const jid of candidateJids) {
      const records = await getMessages(jid, instance, 100) as EvolutionMessage[];
      for (const record of records) {
        const key = record.key;
        if (!key?.id || !requested.has(key.id) || key.fromMe !== false || key.remoteJid !== jid) continue;
        // A identidade alternativa deve vir da origem, nao do cliente.
        if (jid !== remoteJid && key.remoteJidAlt !== remoteJid) continue;
        if (jid === remoteJid && key.remoteJidAlt &&
            candidateJids.size > 1 && !candidateJids.has(key.remoteJidAlt)) continue;
        const existing = byId.get(key.id);
        if (existing) {
          const first = existing.key;
          // Uma mesma mensagem pode ser devolvida pelas consultas JID e LID.
          // Aceitar somente o par espelhado comprovado pela propria Evolution.
          const mirroredPair = first?.remoteJid === key.remoteJidAlt &&
            first?.remoteJidAlt === key.remoteJid &&
            first?.remoteJid !== key.remoteJid &&
            typeof first?.remoteJid === "string" && candidateJids.has(first.remoteJid) &&
            candidateJids.has(key.remoteJid) &&
            (first.remoteJid === remoteJid || key.remoteJid === remoteJid);
          // TF3-A: duas ocorrencias da mesma mensagem na MESMA identidade
          // podem ser consolidadas apenas quando JID principal e alternativo
          // sao identicos. Divergencias continuam rejeitadas com 409.
          const sameIdentityDuplicate =
            typeof first?.remoteJid === "string" &&
            first.remoteJid === key.remoteJid &&
            (first.remoteJidAlt ?? null) === (key.remoteJidAlt ?? null);
          if (!mirroredPair && !sameIdentityDuplicate) {
            // TF3-A: classifica o conflito sem divulgar IDs, JIDs ou conteudo.
            // Nao muda a regra de autorizacao nem aceita a leitura.
            const sameRemoteJid = typeof first?.remoteJid === "string" &&
              first.remoteJid === key.remoteJid;
            const firstAlt = first?.remoteJidAlt ?? null;
            const secondAlt = key.remoteJidAlt ?? null;
            const sameAlt = firstAlt === secondAlt;
            const oneAltMissing = (firstAlt === null) !== (secondAlt === null);
            const tf3ConflictKind = sameRemoteJid
              ? (sameAlt ? "SAME_IDENTITY_DUPLICATE" :
                  oneAltMissing ? "SAME_IDENTITY_ALT_MISSING" : "SAME_IDENTITY_ALT_CONFLICT")
              : (first?.remoteJidAlt === key.remoteJid || key.remoteJidAlt === first?.remoteJid)
                ? "PARTIAL_MIRROR" : "DIFFERENT_IDENTITIES";
            return NextResponse.json({
              error: "ID ambiguo entre identidades",
              tf3Code: "A_IDENTITY_CONFLICT",
              tf3ConflictKind,
            }, { status: 409 });
          }
          // Identidade ja validada: recibo confirmado nao pode ser substituido
          // por uma duplicata antiga sem READ/PLAYED, qualquer que seja a ordem.
          const existingRead = isConfirmedReadStatus(existing.status);
          const recordRead = isConfirmedReadStatus(record.status);
          if ((!existingRead && recordRead) ||
              (existingRead === recordRead && key.remoteJid === remoteJid)) {
            byId.set(key.id, record);
          }
          continue;
        }
        byId.set(key.id, record);
      }
    }
    if (byId.size === 0) {
      return NextResponse.json({ error: "Mensagens nao comprovadas na conversa e instancia", tf3Code: "A_IDS_NOT_VERIFIED", requestedCount: requested.size, verifiedCount: byId.size }, { status: 409 });
    }
    const verified = [...byId.values()];
    const isPartial = byId.size !== requested.size;
    const verificationCounts = { requestedCount: requested.size, verifiedCount: byId.size, unverifiedCount: requested.size - byId.size };
    // Falha fechada para usuarios restritos: a identidade autorizada deve ser
    // a conversa solicitada ou uma identidade alternativa comprovada na origem.
    if (!authorizationService.hasPermission(user, M1MUserPermission.VIEW_ALL_CONVERSATIONS)) {
      const sectorAssignments = await prisma.m1MSectorUser.findMany({ where: { userId: user.userId }, select: { sectorId: true } });
      const sectorIds = sectorAssignments.map((entry) => entry.sectorId);
      if (sectorIds.length === 0) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
      const linked = new Set<string>([remoteJid]);
      for (const message of verified) {
        if (message.key?.remoteJidAlt === remoteJid) linked.add(message.key.remoteJid!);
        if (message.key?.remoteJid === remoteJid && message.key.remoteJidAlt) linked.add(message.key.remoteJidAlt);
      }
      const customers = await prisma.m1MCustomer.findMany({ where: { companyId: user.companyId, remoteJid: { in: [...linked] } } });
      const allowedCustomerIds = customers.filter((customer) =>
        verified.every((message) => message.key?.remoteJid === customer.remoteJid ||
          message.key?.remoteJidAlt === customer.remoteJid ||
          (customer.remoteJid === remoteJid && message.key?.remoteJidAlt === remoteJid)),
      ).map((customer) => customer.id);
      if (allowedCustomerIds.length !== 1) return NextResponse.json({ error: "Identidade nao autorizada ou ambigua" }, { status: 403 });
      const attendance = await prisma.m1MAttendance.findFirst({
        where: { companyId: user.companyId, customerId: allowedCustomerIds[0], state: "HUMANO", sectorId: { in: sectorIds }, OR: [{ responsibleId: null }, { responsibleId: user.userId }] },
        orderBy: { startedAt: "desc" },
      });
      if (!attendance) return NextResponse.json({ error: "Conversa nao autorizada" }, { status: 403 });
    }
    // TF3-A: persistir apenas recibos confirmados pela Evolution.
    // A identidade persistida (historico ou ledger) deve ser comprovada e unica.
    type LedgerReadResult = {
      state: "DISABLED" | "NO_CONFIRMED_IDS" | "PENDING_EVIDENCE" | "PERSISTED";
      confirmedCount: number; unresolvedCount: number;
    };
    let ledgerReadResult: LedgerReadResult = {
      state: process.env.M1M_TF3A_UNREAD_LEDGER_ENABLED === "true" ? "NO_CONFIRMED_IDS" : "DISABLED",
      confirmedCount: 0, unresolvedCount: 0,
    };
    const persistLedgerRead = async (confirmedIds: string[]) => {
      if (process.env.M1M_TF3A_UNREAD_LEDGER_ENABLED !== "true" || confirmedIds.length === 0) return;
      const identityCandidates = new Set<string>(candidateJids);
      for (const message of verified) {
        if (message.key?.remoteJid) identityCandidates.add(message.key.remoteJid);
        if (message.key?.remoteJidAlt) identityCandidates.add(message.key.remoteJidAlt);
      }
      // O historico pode existir antes do primeiro registro do ledger.
      // Resolver pelo cliente persistido somente para IDs ja confirmados.
      const stored = await prisma.m1MMessage.findMany({
        where: {
          companyId: user.companyId, instanceName: instance,
          evolutionMessageId: { in: confirmedIds }, fromMe: false, direction: "IN",
          remoteJid: { in: [...identityCandidates] },
          customer: { companyId: user.companyId },
        },
        select: { customer: { select: { remoteJid: true } } },
      });
      for (const message of stored) identityCandidates.add(message.customer.remoteJid);
      const ledgerStates = await prisma.m1MConversationState.findMany({
        where: { companyId: user.companyId, instanceName: instance, canonicalJid: { in: [...identityCandidates] } },
        select: { canonicalJid: true },
      });
      const canonicalJids = new Set(ledgerStates.map((state) => state.canonicalJid));
      for (const message of stored) canonicalJids.add(message.customer.remoteJid);
      const confirmedRecords = verified.filter((message) => confirmedIds.includes(message.key!.id!));
      const confirmedMessages = confirmedRecords.flatMap((message) => {
        const raw = message.messageTimestamp;
        const seconds = typeof raw === "number" ? raw :
          typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
        const receivedAt = new Date(seconds * 1000);
        return Number.isSafeInteger(seconds) && seconds >= 0 && Number.isFinite(receivedAt.getTime())
          ? [{ evolutionMessageId: message.key!.id!, receivedAt }] : [];
      });
      if (canonicalJids.size === 0 && confirmedMessages.length === confirmedIds.length) {
        // Sem historico: aceitar somente uma identidade oficial/grupo unica
        // comprovada nas chaves da Evolution para TODOS os IDs confirmados.
        const sourceIdentities = confirmedRecords.map((message) => new Set(
          [message.key?.remoteJid, message.key?.remoteJidAlt].filter(
            (jid): jid is string => typeof jid === "string" && /@(s\.whatsapp\.net|g\.us)$/.test(jid),
          ),
        ));
        const sourceJids = new Set(sourceIdentities.flatMap((set) => [...set]));
        if (sourceIdentities.every((set) => set.size === 1) && sourceJids.size === 1) {
          for (const jid of sourceJids) canonicalJids.add(jid);
        }
      }
      const states = [...canonicalJids].map((canonicalJid) => ({ canonicalJid }));
      if (states.length === 0) {
        ledgerReadResult = { state: "PENDING_EVIDENCE", confirmedCount: 0, unresolvedCount: confirmedIds.length };
        return;
      }
      if (states.length !== 1) throw new Error("TF3-A: identidade do ledger ambigua");
      const persisted = await recordConfirmedRead({
        companyId: user.companyId, instanceName: instance,
        canonicalJid: states[0].canonicalJid,
        confirmedEvolutionMessageIds: confirmedIds,
        confirmedMessages,
      });
      ledgerReadResult = {
        state: persisted.unresolvedReadCount > 0 ? "PENDING_EVIDENCE" : "PERSISTED",
        confirmedCount: persisted.persistedReadCount, unresolvedCount: persisted.unresolvedReadCount,
      };
    };
    const isRead = isConfirmedReadStatus;
    const pending = verified.filter((message) => !isRead(message.status));
    const alreadyReadIds = verified.filter((message) => isRead(message.status)).map((message) => message.key!.id!);
    // TF3-A: contagens agregadas, sem IDs, JIDs ou conteudo.
    const tf3ReadCounts = { verifiedAlreadyReadCount: verified.length - pending.length, verifiedPendingCount: pending.length };
    const ledgerPendingResponse = () => NextResponse.json({
      ok: true, state: "ACCEPTED_UNCONFIRMED", accepted: true, confirmed: false,
      verifiedConfirmed: true, ledgerRead: ledgerReadResult,
      tf3Code: "B_LEDGER_RECONCILIATION_PENDING", requested: requested.size,
      ...verificationCounts, ...tf3ReadCounts,
    });
    if (pending.length === 0) {
      await persistLedgerRead(verified.map((message) => message.key!.id!));
      if (ledgerReadResult.state === "PENDING_EVIDENCE") return ledgerPendingResponse();
      return NextResponse.json({ ok: true, state: isPartial ? "PARTIALLY_CONFIRMED" : "CONFIRMED", confirmed: !isPartial, verifiedConfirmed: true, ledgerRead: ledgerReadResult, ...verificationCounts, ...tf3ReadCounts, requested: requested.size });
    }
    // Reverificacao autorizada consulta a Evolution sem reenviar marcacao.
    // Mantem a identidade, a instancia e as permissoes ja verificadas acima.
    if ((payload as { verifyOnly?: unknown }).verifyOnly === true) {
      await persistLedgerRead(alreadyReadIds);
      return NextResponse.json({
        ok: true, state: "ACCEPTED_UNCONFIRMED", accepted: true, confirmed: false,
        tf3Code: "B_RECHECK_UNCONFIRMED", requested: requested.size, ledgerRead: ledgerReadResult,
        ...verificationCounts, ...tf3ReadCounts,
      });
    }
    const readMessages = pending.map((message) => {
      const key = message.key!;
      const participant =
        key.remoteJid?.endsWith("@g.us") &&
        typeof key.participant === "string" &&
        /^[0-9A-Za-z._:-]+@(s\.whatsapp\.net|lid)$/.test(key.participant)
          ? key.participant
          : undefined;
      return {
        remoteJid: key.remoteJid!,
        fromMe: false,
        id: key.id!,
        ...(participant ? { participant } : {}),
      };
    });
    const response = await fetch(`${API_URL}/chat/markMessageAsRead/${encodeURIComponent(instance)}`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: API_KEY },
      body: JSON.stringify({ readMessages }), cache: "no-store", signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return NextResponse.json({ state: "REJECTED", confirmed: false, tf3Code: "A_EVOLUTION_REJECTED", error: "Evolution recusou marcacao" }, { status: 502 });
    const resultText = await response.text();
    let result: unknown = null;
    try { result = resultText ? JSON.parse(resultText) : null; } catch { /* resposta textual */ }
    if (result === false || (result && typeof result === "object" &&
      (("success" in result && result.success === false) || ("error" in result && Boolean(result.error))))) {
      return NextResponse.json({ state: "REJECTED", confirmed: false }, { status: 502 });
    }
    // Confirma TODOS os IDs na mesma identidade persistida. Uma mensagem nova
    // ou homonima nao pode servir como comprovante de outra.
    // TF3: contagens agregadas, sem IDs, JIDs, conteudo ou credenciais.
    // Apenas observabilidade: nao altera tempos, estados nem criterio de confirmacao.
    const tf3ConfirmationAttempts: Array<{
      attempt: number; confirmedCount: number; matchedCount: number;
      readCount: number; playedCount: number; otherStatusCount: number;
    }> = [];
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 650));
        const confirmed = new Set<string>();
        const matched = new Set<string>();
        const read = new Set<string>();
        const played = new Set<string>();
        for (const jid of candidateJids) {
          const records = await getMessages(jid, instance, 100) as EvolutionMessage[];
          for (const message of records) {
            const original = message.key?.id ? byId.get(message.key.id) : undefined;
            if (original && message.key?.remoteJid === original.key?.remoteJid &&
                message.key?.fromMe === false) {
              matched.add(message.key.id!);
              if (message.status === "READ") read.add(message.key.id!);
              if (message.status === "PLAYED") played.add(message.key.id!);
              if (isRead(message.status)) confirmed.add(message.key.id!);
            }
          }
        }
        tf3ConfirmationAttempts.push({
          attempt: attempt + 1, confirmedCount: confirmed.size,
          matchedCount: matched.size, readCount: read.size, playedCount: played.size,
          otherStatusCount: matched.size - confirmed.size,
        });
        // Recibos ja confirmados sao persistidos mesmo se outros permanecerem pendentes.
        await persistLedgerRead([...new Set([...alreadyReadIds, ...confirmed])]);
        if (confirmed.size === verified.length) {
          if (ledgerReadResult.state === "PENDING_EVIDENCE") return ledgerPendingResponse();
          return NextResponse.json({ ok: true, state: isPartial ? "PARTIALLY_CONFIRMED" : "CONFIRMED", accepted: true, confirmed: !isPartial, verifiedConfirmed: true, ...verificationCounts, ...tf3ReadCounts, requested: requested.size,
            ledgerRead: ledgerReadResult, tf3Confirmation: { pendingCount: pending.length, attempts: tf3ConfirmationAttempts } });
        }
      }
    } catch {
      return NextResponse.json({ state: "CONFIRMATION_FAILED", accepted: true, confirmed: false, ...verificationCounts, ...tf3ReadCounts, tf3Code: "B_CONFIRMATION_QUERY_FAILED",
        tf3Confirmation: { pendingCount: pending.length, attempts: tf3ConfirmationAttempts } }, { status: 502 });
    }
    return NextResponse.json({ ok: true, state: "ACCEPTED_UNCONFIRMED", accepted: true, confirmed: false, ...verificationCounts, ...tf3ReadCounts,
      tf3Code: "B_ACCEPTED_UNCONFIRMED", requested: requested.size, ledgerRead: ledgerReadResult,
      tf3Confirmation: { pendingCount: pending.length, attempts: tf3ConfirmationAttempts } });
  } catch (error) {
    console.error("[TF3] Falha ao marcar mensagens como lidas", error);
    return NextResponse.json({ error: "Falha ao confirmar leitura" }, { status: 500 });
  }
}
