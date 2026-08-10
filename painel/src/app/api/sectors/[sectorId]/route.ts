import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import { sectorService } from "@/services/sector.service";

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

    const sector =
      await sectorService.getSector(
        companyId,
        sectorId,
      );

    return NextResponse.json(sector);
  } catch (error) {
    console.error(
      "ERRO SECTORS GET BY ID:",
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
  try {
    const companyId =
      await getAuthenticatedCompanyId();

    const { sectorId } =
      await context.params;

    const body = await request.json();

    const sector =
      await sectorService.updateSector(
        companyId,
        sectorId,
        {
          name: body.name,
          description:
            body.description,
          knowledge:
            body.knowledge,
          active: body.active,
          sortOrder: body.sortOrder,
        },
      );

    return NextResponse.json(sector);
  } catch (error) {
    console.error(
      "ERRO SECTORS PUT:",
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
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const companyId =
      await getAuthenticatedCompanyId();

    const { sectorId } =
      await context.params;

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
      "ERRO SECTORS DELETE:",
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
