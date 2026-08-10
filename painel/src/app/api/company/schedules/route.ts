import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import { companyScheduleService } from "@/services/company-schedule.service";

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

    const result =
      await companyScheduleService.getSchedules(
        companyId,
      );

    return NextResponse.json(
      result,
    );
  } catch (error) {
    console.error(
      "ERRO COMPANY SCHEDULES GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar os horários gerais da empresa.",
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
) {
  try {
    const companyId =
      await getAuthenticatedCompanyId();

    const body =
      await request.json();

    const result =
      await companyScheduleService.updateSchedules(
        companyId,
        body.schedules,
      );

    return NextResponse.json(
      result,
    );
  } catch (error) {
    console.error(
      "ERRO COMPANY SCHEDULES PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao salvar os horários gerais da empresa.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}
