import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  companyScheduleService,
} from "@/services/company-schedule.service";

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
    const {
      companyId,
    } = await context.params;

    const result =
      await companyScheduleService.getSchedules(
        companyId,
      );

    return NextResponse.json(
      result,
    );
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY SCHEDULES GET:",
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
    } = await context.params;

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
      "ERRO ADMIN COMPANY SCHEDULES PUT:",
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
