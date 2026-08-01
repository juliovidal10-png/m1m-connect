import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getCurrentCompanyId } from "@/lib/tenant";
import { sectorAvailabilityService } from "@/services/sector-availability.service";

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
      await sectorAvailabilityService.isSectorOpenNow(
        companyId,
        sectorId,
        {
          timeZone:
            "America/Cuiaba",
        },
      );

    return NextResponse.json(
      result,
    );
  } catch (error) {
    console.error(
      "ERRO SECTOR AVAILABILITY GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao verificar a disponibilidade do setor.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}