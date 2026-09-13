import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  whatsappConnectionService,
} from "@/services/whatsapp/whatsapp-connection.service";

type RouteContext = {
  params: Promise<{
    companyId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  if (
    !adminAuthService.isAuthorizedRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Acesso administrativo não autorizado.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const {
      companyId,
    } = await context.params;

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
    console.error(
      "[ADMIN WHATSAPP STATUS]",
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
