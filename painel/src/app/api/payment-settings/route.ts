import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  paymentSettingsService,
} from "@/services/payment-settings.service";

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
        status: 500,
      },
    );
  }
}
