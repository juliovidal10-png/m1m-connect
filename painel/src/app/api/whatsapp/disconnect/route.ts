import { NextResponse } from "next/server";

import { M1MUserPermission } from "@/generated/prisma/enums";
import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  authorizationService,
} from "@/services/auth/authorization.service";
import {
  whatsappConnectionService,
} from "@/services/whatsapp/whatsapp-connection.service";

export async function POST() {
  try {
    await authorizationService.requirePermission(
      M1MUserPermission.ACCESS_SETTINGS,
    );

    const companyId =
      await getAuthenticatedCompanyId();

    const result =
      await whatsappConnectionService.disconnect(
        companyId,
      );

    return NextResponse.json(
      result.body,
      {
        status: result.status,
      },
    );
  } catch (error) {
    console.error(
      "[WHATSAPP DISCONNECT]",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao desconectar o WhatsApp.",
      },
      {
        status: 500,
      },
    );
  }
}
