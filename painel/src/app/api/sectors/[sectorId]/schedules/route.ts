import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import { sectorScheduleService } from "@/services/sector-schedule.service";

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
      await getAuthenticatedCompanyId();

    const { sectorId } =
      await context.params;

    const result =
      await sectorScheduleService.getSchedules(
        companyId,
        sectorId,
      );

    return NextResponse.json(
      result,
    );
  } catch (error) {
    console.error(
      "ERRO SECTOR SCHEDULES GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar os horários.",
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

    const body =
      await request.json();

    const result =
      await sectorScheduleService.updateSchedules(
        companyId,
        sectorId,
        {
          useCustomSchedule:
            body.useCustomSchedule,
          schedules:
            body.schedules,
        },
      );

    return NextResponse.json(
      result,
    );
  } catch (error) {
    console.error(
      "ERRO SECTOR SCHEDULES PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao salvar os horários.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}
