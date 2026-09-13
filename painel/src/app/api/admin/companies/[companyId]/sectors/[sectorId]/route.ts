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

    const sector =
      await sectorService.getSector(
        companyId,
        sectorId,
      );

    return NextResponse.json(sector);
  } catch (error) {
    console.error(
      "ERRO ADMIN SECTOR GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar o setor.",
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

    const sector =
      await sectorService.updateSector(
        companyId,
        sectorId,
        {
          name: body.name,
          description: body.description,
          knowledge: body.knowledge,
          active: body.active,
          sortOrder: body.sortOrder,
        },
      );

    return NextResponse.json(sector);
  } catch (error) {
    console.error(
      "ERRO ADMIN SECTOR PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao atualizar o setor.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
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

    const sector =
      await sectorService.deleteSector(
        companyId,
        sectorId,
      );

    return NextResponse.json({
      success: true,
      sector,
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN SECTOR DELETE:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao excluir o setor.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}
