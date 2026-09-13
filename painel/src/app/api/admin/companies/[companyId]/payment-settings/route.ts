import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  paymentSettingsService,
} from "@/services/payment-settings.service";

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

    const settings =
      await paymentSettingsService.getPaymentSettings(
        companyId,
      );

    return NextResponse.json(
      settings,
    );
  } catch (error) {
    console.error(
      "ERRO ADMIN PAYMENT SETTINGS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar as configurações de pagamento.",
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

    const settings =
      await paymentSettingsService.savePaymentSettings(
        companyId,
        {
          acceptsPix:
            body.acceptsPix,
          acceptsCash:
            body.acceptsCash,
          acceptsCreditCard:
            body.acceptsCreditCard,
          acceptsDebitCard:
            body.acceptsDebitCard,
          acceptsBankSlip:
            body.acceptsBankSlip,
          acceptsBankTransfer:
            body.acceptsBankTransfer,
          pixKeyType:
            body.pixKeyType,
          pixKey:
            body.pixKey,
          pixHolderName:
            body.pixHolderName,
          pixHolderDocument:
            body.pixHolderDocument,
          bankName:
            body.bankName,
          bankAgency:
            body.bankAgency,
          bankAccount:
            body.bankAccount,
          bankAccountType:
            body.bankAccountType,
          maxInstallments:
            body.maxInstallments,
          installmentInterest:
            body.installmentInterest,
          paymentDeadline:
            body.paymentDeadline,
          receiptInstructions:
            body.receiptInstructions,
          billingRules:
            body.billingRules,
          additionalInformation:
            body.additionalInformation,
        },
      );

    return NextResponse.json(
      settings,
    );
  } catch (error) {
    console.error(
      "ERRO ADMIN PAYMENT SETTINGS PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao salvar as configurações de pagamento.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}
