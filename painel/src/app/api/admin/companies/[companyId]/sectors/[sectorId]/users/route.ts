import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  sectorUserService,
} from "@/services/sector-user.service";

type RouteContext = {
  params: Promise<{
    companyId: string;
    sectorId: string;
  }>;
};

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

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
      sectorId,
    } = await context.params;

    const result =
      await sectorUserService.getSectorUsers(
        companyId,
        sectorId,
      );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "ERRO ADMIN SECTOR USERS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar responsáveis do setor.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
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
      sectorId,
    } = await context.params;

    const body = await request.json();

    const result =
      await sectorUserService.updateSectorUsers(
        companyId,
        sectorId,
        body.userIds,
      );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "ERRO ADMIN SECTOR USERS PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao atualizar responsáveis do setor.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}
