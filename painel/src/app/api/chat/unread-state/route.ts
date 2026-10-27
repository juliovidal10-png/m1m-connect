import { NextResponse } from "next/server";
import { authorizationService } from "@/services/auth/authorization.service";
import { M1MUserPermission } from "@/generated/prisma/enums";
import { getLedgerScope, getVisibleLedgerBatch, validLoadedJids } from "@/services/conversation-ledger-access.service";

export async function POST(request: Request) {
  try {
    const user = await authorizationService.getCurrentUser();
    if (process.env.M1M_TF3A_UNREAD_LEDGER_ENABLED !== "true") return NextResponse.json({error: "Indicador desativado"}, {status: 503});
    const input = await request.json();
    if (!input || typeof input.scopeKey !== "string" || !validLoadedJids(input.canonicalJids)) return NextResponse.json({error: "Lote invalido"}, {status: 400});
    const scope = await getLedgerScope(user, authorizationService.hasPermission(user, M1MUserPermission.VIEW_ALL_CONVERSATIONS));
    if (input.scopeKey !== scope.key) return NextResponse.json({error: "LEDGER_SCOPE_CHANGED"}, {status: 409});
    const states = await getVisibleLedgerBatch(scope, input.canonicalJids);
    return NextResponse.json({scopeKey: scope.key, states}, {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    console.error("[TF3-A] Falha ao consultar lote de estados", error);
    return NextResponse.json({error: "Falha ao consultar estados"}, {status: 500});
  }
}
