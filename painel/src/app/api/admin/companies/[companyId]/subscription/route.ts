import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  M1MBillingCycle,
} from "@/generated/prisma/enums";
import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  adminCompanySubscriptionService,
} from "@/services/admin/admin-company-subscription.service";

type RouteContext = {
  params: Promise<{
    companyId: string;
  }>;
};

function normalizeBillingCycle(
  value: unknown,
): M1MBillingCycle | null {
  const normalized =
    typeof value === "string"
      ? value.trim().toUpperCase()
      : "";

  if (
    normalized ===
      M1MBillingCycle.MONTHLY ||
    normalized ===
      M1MBillingCycle.QUARTERLY ||
    normalized ===
      M1MBillingCycle.SEMIANNUAL ||
    normalized ===
      M1MBillingCycle.ANNUAL
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
      typeof body?.action ===
      "string"
        ? body.action
            .trim()
            .toUpperCase()
        : "SAVE";

    if (
      action === "RENEW"
    ) {
      const company =
        await adminCompanySubscriptionService.renewSubscription(
          companyId,
        );

      return NextResponse.json({
        success: true,
        action:
          "RENEW",
        company,
      });
    }

    const planName =
      typeof body?.planName ===
      "string"
        ? body.planName.trim()
        : "";

    if (!planName) {
      return NextResponse.json(
        {
          error:
            "Informe o nome do plano.",
        },
        {
          status: 400,
        },
      );
    }

    const price =
      Number(
        body?.subscriptionPriceCents,
      );

    if (
      !Number.isInteger(price) ||
      price < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Valor da assinatura inválido.",
        },
        {
          status: 400,
        },
      );
    }

    const billingCycle =
      normalizeBillingCycle(
        body?.billingCycle,
      );

    if (!billingCycle) {
      return NextResponse.json(
        {
          error:
            "Periodicidade inválida.",
        },
        {
          status: 400,
        },
      );
    }

    const accessEndsAt =
      new Date(
        body?.accessEndsAt,
      );

    if (
      Number.isNaN(
        accessEndsAt.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Vencimento do acesso inválido.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      accessEndsAt <=
      new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "O vencimento do acesso deve estar no futuro.",
        },
        {
          status: 400,
        },
      );
    }

    const company =
      await adminCompanySubscriptionService.saveSubscription({
        companyId,
        planName,
        subscriptionPriceCents:
          price,
        billingCycle,
        accessEndsAt,
      });

    return NextResponse.json({
      success: true,
      action:
        "SAVE",
      company,
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY SUBSCRIPTION POST:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar a assinatura.",
      },
      {
        status: 400,
      },
    );
  }
}
