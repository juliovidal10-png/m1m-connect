import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import { sectorService } from "@/services/sector.service";

type RouteContext = {
  params: Promise<{
    companyId: string;
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
    const { companyId } = await context.params;

    const sectors =
      await sectorService.listSectors(
        companyId,
      );

    return NextResponse.json(sectors);
  } catch (error) {
    console.error(
      "ERRO ADMIN SECTORS GET:",
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
        status: 500,
      },
    );
  }
}

export async function POST(
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
    const { companyId } = await context.params;
    const body = await request.json();

    const sector =
      await sectorService.createSector(
        companyId,
        {
          name: body.name,
          description: body.description,
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
      "ERRO ADMIN SECTORS POST:",
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
        status: 500,
      },
    );
  }
}
