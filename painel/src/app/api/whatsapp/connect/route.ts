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
      await whatsappConnectionService.connect(
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
      "[WHATSAPP CONNECT]",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao gerar o QR Code do WhatsApp.",
      },
      {
        status: 500,
      },
    );
  }
}
