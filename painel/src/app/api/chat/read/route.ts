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
      key?: { id?: string; remoteJid?: string; remoteJidAlt?: string; fromMe?: boolean };
      status?: string | null;
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
        if (byId.has(key.id)) return NextResponse.json({ error: "ID ambiguo entre identidades" }, { status: 409 });
        byId.set(key.id, record);
      }
    }
    if (byId.size !== requested.size) {
      return NextResponse.json({ error: "Mensagens nao comprovadas na conversa e instancia", tf3Code: "A_IDS_NOT_VERIFIED", requestedCount: requested.size, verifiedCount: byId.size }, { status: 409 });
    }
    const verified = [...byId.values()];
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
    const isRead = (status: string | null | undefined) => status === "READ" || status === "PLAYED";
    const pending = verified.filter((message) => !isRead(message.status));
    if (pending.length === 0) return NextResponse.json({ ok: true, state: "CONFIRMED", confirmed: true, requested: requested.size });
    const readMessages = pending.map((message) => ({ remoteJid: message.key!.remoteJid!, fromMe: false, id: message.key!.id! }));
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
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 650));
        const confirmed = new Set<string>();
        for (const jid of candidateJids) {
          const records = await getMessages(jid, instance, 100) as EvolutionMessage[];
          for (const message of records) {
            const original = message.key?.id ? byId.get(message.key.id) : undefined;
            if (original && message.key?.remoteJid === original.key?.remoteJid &&
                message.key?.fromMe === false && isRead(message.status)) confirmed.add(message.key.id!);
          }
        }
        if (confirmed.size === requested.size) {
          return NextResponse.json({ ok: true, state: "CONFIRMED", accepted: true, confirmed: true, requested: requested.size });
        }
      }
    } catch {
      return NextResponse.json({ state: "CONFIRMATION_FAILED", accepted: true, confirmed: false, tf3Code: "B_CONFIRMATION_QUERY_FAILED" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, state: "ACCEPTED_UNCONFIRMED", accepted: true, confirmed: false, tf3Code: "B_ACCEPTED_UNCONFIRMED", requested: requested.size });
  } catch (error) {
    console.error("[TF3] Falha ao marcar mensagens como lidas", error);
    return NextResponse.json({ error: "Falha ao confirmar leitura" }, { status: 500 });
  }
}
