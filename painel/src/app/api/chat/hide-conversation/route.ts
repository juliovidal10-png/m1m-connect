import { NextRequest, NextResponse } from "next/server";
import { authorizationService } from "@/services/auth/authorization.service";
import { companyRepository } from "@/repositories/company.repository";
import { M1MUserPermission } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { hideConversationState } from "@/services/conversation-unread-state.service";

/** TF3-A: exclusao logica separada da exclusao de mensagens individuais. */
export async function POST(request: NextRequest) {
  try {
    const user = await authorizationService.getCurrentUser();
    if (!authorizationService.hasPermission(user, M1MUserPermission.VIEW_ALL_CONVERSATIONS)) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }
    if (process.env.M1M_TF3A_UNREAD_LEDGER_ENABLED !== "true") {
      return NextResponse.json({ error: "TF3-A nao habilitada" }, { status: 503 });
    }
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Parametros invalidos" }, { status: 400 });
    }
    const input = payload as { canonicalJid?: unknown; confirm?: unknown };
    const canonicalJid = typeof input.canonicalJid === "string" ? input.canonicalJid.trim() : "";
    if (!/^[0-9A-Za-z._:-]+@(s\.whatsapp\.net|lid|g\.us)$/.test(canonicalJid) || input.confirm !== true) {
      return NextResponse.json({ error: "Confirmacao explicita e identidade valida obrigatorias" }, { status: 400 });
    }
    const company = await companyRepository.findById(user.companyId);
    const instanceName = company?.whatsappInstanceName?.trim();
    if (!instanceName) return NextResponse.json({ error: "Instancia indisponivel" }, { status: 503 });
    // Falha fechada: somente estados ja registrados e vinculados a empresa/instancia.
    const state = await prisma.m1MConversationState.findUnique({
      where: { companyId_instanceName_canonicalJid: { companyId: user.companyId, instanceName, canonicalJid } },
      select: { id: true },
    });
    if (!state) return NextResponse.json({ error: "Conversa nao encontrada no novo mecanismo" }, { status: 404 });
    await hideConversationState({ companyId: user.companyId, instanceName, canonicalJid });
    return NextResponse.json({ ok: true, hidden: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[TF3-A] Falha na exclusao logica", error);
    return NextResponse.json({ error: "Falha ao excluir conversa" }, { status: 500 });
  }
}
