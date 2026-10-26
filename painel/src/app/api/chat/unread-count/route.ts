import { NextResponse } from "next/server";
import { authorizationService } from "@/services/auth/authorization.service";
import { companyRepository } from "@/repositories/company.repository";
import { M1MUserPermission } from "@/generated/prisma/enums";
import { countUnreadConversations } from "@/services/conversation-unread-state.service";

/**
 * TF3-A: leitura agregada do ledger, independente da paginacao da lista.
 * Nao substitui o endpoint legado ate validacao dos dados e das permissoes.
 */
export async function GET() {
  try {
    const user = await authorizationService.getCurrentUser();
    if (!authorizationService.hasPermission(user, M1MUserPermission.VIEW_ALL_CONVERSATIONS)) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }
    if (process.env.M1M_TF3A_UNREAD_LEDGER_ENABLED !== "true") {
      return NextResponse.json({ error: "Indicador TF3-A nao habilitado" }, { status: 503 });
    }
    const company = await companyRepository.findById(user.companyId);
    const instanceName = company?.whatsappInstanceName?.trim();
    if (!instanceName) {
      return NextResponse.json({ error: "Instancia indisponivel" }, { status: 503 });
    }
    const count = await countUnreadConversations(user.companyId, instanceName);
    return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[TF3-A] Falha ao consultar contador agregado", error);
    return NextResponse.json({ error: "Falha ao consultar indicador" }, { status: 500 });
  }
}
