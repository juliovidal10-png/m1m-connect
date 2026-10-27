import { NextResponse } from "next/server";
import { authorizationService } from "@/services/auth/authorization.service";
import { M1MUserPermission } from "@/generated/prisma/enums";
import { getLedgerScope, countVisibleLedgerConversations } from "@/services/conversation-ledger-access.service";
export async function GET() {
  try {
    const user = await authorizationService.getCurrentUser();
    if (process.env.M1M_TF3A_UNREAD_LEDGER_ENABLED !== "true") return NextResponse.json({error: "Indicador desativado"}, {status: 503});
    const scope = await getLedgerScope(user, authorizationService.hasPermission(user, M1MUserPermission.VIEW_ALL_CONVERSATIONS));
    const count = await countVisibleLedgerConversations(scope);
    return NextResponse.json({count, ledgerScopeKey: scope.key}, {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    console.error("[TF3-A] Falha no agregado", error);
    return NextResponse.json({error: "Falha ao consultar indicador"}, {status: 500});
  }
}
