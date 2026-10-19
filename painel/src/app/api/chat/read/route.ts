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

    // Para usuarios restritos, aplica o mesmo escopo da listagem: setor + HUMANO + livre/proprio.
    if (!authorizationService.hasPermission(user, M1MUserPermission.VIEW_ALL_CONVERSATIONS)) {
      const sectorAssignments = await prisma.m1MSectorUser.findMany({ where: { userId: user.userId }, select: { sectorId: true } });
      const sectorIds = sectorAssignments.map((entry) => entry.sectorId);
      if (sectorIds.length === 0) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
      // Busca exata pelo JID da empresa; falha fechada quando nao for possivel correlacionar.
      const customer = await prisma.m1MCustomer.findFirst({ where: { companyId: user.companyId, remoteJid } });
      if (!customer) return NextResponse.json({ error: "Conversa nao autorizada" }, { status: 403 });
      const attendance = await prisma.m1MAttendance.findFirst({
        where: { companyId: user.companyId, customerId: customer.id, state: "HUMANO", sectorId: { in: sectorIds }, OR: [{ responsibleId: null }, { responsibleId: user.userId }] },
        orderBy: { startedAt: "desc" },
      });
      if (!attendance) return NextResponse.json({ error: "Conversa nao autorizada" }, { status: 403 });
    }

    // Valida os IDs contra mensagens reais da instancia, nao confia em IDs arbitrarios do cliente.
    const messages = await getMessages(remoteJid, instance, 100) as Array<{ key?: { id?: string; remoteJid?: string; fromMe?: boolean } }>;
    const requested = new Set(ids as string[]);
    if (requested.size !== ids.length) return NextResponse.json({ error: "IDs duplicados" }, { status: 400 });
    const verified = messages.filter((message) =>
      message?.key?.id && requested.has(message.key.id) && message.key.remoteJid === remoteJid && message.key.fromMe === false,
    ).map((message) => ({ remoteJid, fromMe: false, id: message.key!.id! }));
    if (new Set(verified.map((item) => item.id)).size !== requested.size) {
      return NextResponse.json({ error: "Nem todas as mensagens foram localizadas na instancia" }, { status: 409 });
    }
    const response = await fetch(`${API_URL}/chat/markMessageAsRead/${encodeURIComponent(instance)}`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: API_KEY },
      body: JSON.stringify({ readMessages: verified }), cache: "no-store", signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return NextResponse.json({ error: "Evolution recusou marcacao de leitura" }, { status: 502 });
    // HTTP 2xx indica aceite da chamada, nao prova sincronizacao no WhatsApp.
    // Respostas explicitamente negativas nao podem limpar o badge.
    const resultText = await response.text();
    let result: unknown = null;
    try { result = resultText ? JSON.parse(resultText) : null; } catch { /* resposta textual permitida */ }
    if (result === false || (result && typeof result === "object" &&
      (("success" in result && result.success === false) ||
       ("error" in result && Boolean(result.error))))) {
      return NextResponse.json({ error: "Evolution informou falha na leitura" }, { status: 502 });
    }
    // O retorno HTTP confirma somente o recebimento da solicitacao pela Evolution.
    // Sem prova posterior por mensagem, nao declarar leitura confirmada.
    return NextResponse.json({
      ok: true,
      state: "ACCEPTED_UNCONFIRMED",
      accepted: true,
      confirmed: false,
      requested: requested.size,
      message: "Solicitacao aceita; leitura ainda nao confirmada",
    });
  } catch (error) {
    console.error("[TF3] Falha ao marcar mensagens como lidas", error);
    return NextResponse.json({ error: "Falha ao confirmar leitura" }, { status: 500 });
  }
}
