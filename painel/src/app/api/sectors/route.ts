import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  M1MUserPermission,
} from "@/generated/prisma/enums";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  AuthorizationError,
  authorizationService,
} from "@/services/auth/authorization.service";
import { sectorService } from "@/services/sector.service";

function getErrorStatus(
  error: unknown,
) {
  return error instanceof AuthorizationError
    ? error.statusCode
    : 500;
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

export async function GET() {
  try {
    const companyId =
      await getAuthenticatedCompanyId();

    const sectors =
      await sectorService.listSectors(
        companyId,
      );

    return NextResponse.json(sectors);
  } catch (error) {
    console.error(
      "ERRO SECTORS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar os setores.",
        ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const authorizedUser =
      await authorizationService.requirePermission(
        M1MUserPermission.MANAGE_SECTORS,
      );

    const companyId =
      authorizedUser.companyId;

    const body = await request.json();

    const sector =
      await sectorService.createSector(
        companyId,
        {
          name: body.name,
          description:
            body.description,
          active: body.active,
          sortOrder: body.sortOrder,
        },
      );

    return NextResponse.json(
      sector,
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "ERRO SECTORS POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao criar o setor.",
        ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}
