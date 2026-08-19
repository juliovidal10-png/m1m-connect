import {
  NextRequest,
  NextResponse,
} from "next/server";

import { M1MUserPermission } from "@/generated/prisma/enums";
import { authorizationService } from "@/services/auth/authorization.service";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import { sectorUserService } from "@/services/sector-user.service";

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

type RouteContext = {
  params: Promise<{
    sectorId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const companyId =
      await getAuthenticatedCompanyId();

    const { sectorId } =
      await context.params;

    const result =
      await sectorUserService.getSectorUsers(
        companyId,
        sectorId,
      );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "ERRO SECTOR USERS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar os responsáveis do setor.",
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
  try {
    await authorizationService.requirePermission(
      M1MUserPermission.MANAGE_SECTORS,
    );
    const companyId =
      await getAuthenticatedCompanyId();

    const { sectorId } =
      await context.params;

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
      "ERRO SECTOR USERS PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao salvar os responsáveis do setor.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}


