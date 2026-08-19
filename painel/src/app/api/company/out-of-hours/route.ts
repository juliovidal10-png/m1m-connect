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
import {
  outOfHoursService,
} from "@/services/out-of-hours.service";

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
      await outOfHoursService.getCompanyMessage(
        companyId,
      );

    return NextResponse.json({
      message: result,
    });
  } catch (error) {
    console.error(
      "ERRO COMPANY OUT OF HOURS GET:",
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
        M1MUserPermission.ACCESS_SETTINGS,
      );

    const companyId =
      authorizedUser.companyId;

    const body =
      await request.json();

    const company =
      await outOfHoursService.updateCompanyMessage(
        companyId,
        body.message,
      );

    return NextResponse.json(
      company,
    );
  } catch (error) {
    console.error(
      "ERRO COMPANY OUT OF HOURS PUT:",
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
        status: getErrorStatus(error),
      },
    );
  }
}
