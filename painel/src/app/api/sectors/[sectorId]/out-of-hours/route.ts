import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getCurrentCompanyId } from "@/lib/tenant";
import { outOfHoursService } from "@/services/out-of-hours.service";

type RouteContext = {
  params: Promise<{
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
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const companyId =
      getCurrentCompanyId();

    const { sectorId } =
      await context.params;

    const result =
      await outOfHoursService.getSettings(
        companyId,
        sectorId,
      );

    return NextResponse.json(
      result,
    );
  } catch (error) {
    console.error(
      "ERRO OUT OF HOURS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar a mensagem fora do expediente.",
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
      getCurrentCompanyId();

    const { sectorId } =
      await context.params;

    const body =
      await request.json();

    const sector =
      await outOfHoursService.updateSectorMessage(
        companyId,
        sectorId,
        {
          useCustomMessage:
            body.useCustomMessage,
          message:
            body.message,
        },
      );

    return NextResponse.json(
      sector,
    );
  } catch (error) {
    console.error(
      "ERRO OUT OF HOURS PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao salvar a mensagem fora do expediente.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}