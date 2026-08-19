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
import { companyScheduleService } from "@/services/company-schedule.service";

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
        status: getErrorStatus(error),
      },
    );
  }
}

export async function PUT(
  request: NextRequest,
) {
  try {
    const authorizedUser =
      await authorizationService.requirePermission(
        M1MUserPermission.MANAGE_HOURS,
      );

    const companyId =
      authorizedUser.companyId;

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
        status: getErrorStatus(error),
      },
    );
  }
}
