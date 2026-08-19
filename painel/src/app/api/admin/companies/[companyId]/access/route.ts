import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  companyAccessService,
} from "@/services/company-access.service";

type RouteContext = {
  params: Promise<{
    companyId: string;
  }>;
};

type AccessAction =
  | "ACTIVATE"
  | "SUSPEND"
  | "EXTEND_TRIAL_7_DAYS"
  | "REDUCE_TRIAL_1_DAY"
  | "RESET_TRIAL_7_DAYS";

function normalizeAction(
  value: unknown,
): AccessAction | null {
  const normalized =
    typeof value === "string"
      ? value.trim().toUpperCase()
      : "";

  if (
    normalized === "ACTIVATE" ||
    normalized === "SUSPEND" ||
    normalized === "EXTEND_TRIAL_7_DAYS" ||
    normalized === "REDUCE_TRIAL_1_DAY" ||
    normalized === "RESET_TRIAL_7_DAYS"
  ) {
    return normalized;
  }

  return null;
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
    const {
      companyId,
    } = await context.params;

    const body =
      await request.json();

    const action =
      normalizeAction(
        body?.action,
      );

    if (!action) {
      return NextResponse.json(
        {
          error:
            "Ação de acesso inválida.",
        },
        {
          status: 400,
        },
      );
    }

    let company;

    if (
      action === "ACTIVATE"
    ) {
      company =
        await companyAccessService.activateCompany(
          companyId,
        );
    } else if (
      action === "SUSPEND"
    ) {
      company =
        await companyAccessService.suspendCompany(
          companyId,
        );
    } else if (
      action === "EXTEND_TRIAL_7_DAYS"
    ) {
      company =
        await companyAccessService.extendTrialSevenDays(
          companyId,
        );
    } else if (
      action === "REDUCE_TRIAL_1_DAY"
    ) {
      company =
        await companyAccessService.reduceTrialOneDay(
          companyId,
        );
    } else {
      company =
        await companyAccessService.resetTrialSevenDays(
          companyId,
        );
    }

    return NextResponse.json({
      success: true,
      action,
      company,
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY ACCESS POST:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível alterar o acesso da empresa.",
      },
      {
        status: 400,
      },
    );
  }
}
