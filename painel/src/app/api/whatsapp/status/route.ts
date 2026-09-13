import { NextResponse } from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  whatsappConnectionService,
} from "@/services/whatsapp/whatsapp-connection.service";

export async function GET() {
  try {
    const companyId =
      await getAuthenticatedCompanyId();

    const result =
      await whatsappConnectionService.getStatus(
        companyId,
      );

    return NextResponse.json(
      result.body,
      {
        status: result.status,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      /sess[aã]o|autentic|cookie|companyId|empresa autenticada/i.test(
        message,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Nao autenticado.",
        },
        {
          status: 401,
        },
      );
    }

    console.error(
      "[WHATSAPP STATUS]",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao consultar o WhatsApp.",
      },
      {
        status: 500,
      },
    );
  }
}
