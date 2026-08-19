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
  paymentSettingsService,
} from "@/services/payment-settings.service";

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

    const settings =
      await paymentSettingsService.getPaymentSettings(
        companyId,
      );

    return NextResponse.json(
      settings,
    );
  } catch (error) {
    console.error(
      "ERRO PAYMENT SETTINGS GET:",
      error,
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
            error,
            "Erro ao carregar as configurações de pagamento.",
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
      "ERRO PAYMENT SETTINGS PUT:",
      error,
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
            error,
            "Erro ao salvar as configurações de pagamento.",
          ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}
