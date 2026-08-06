import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  M1MAttendanceActorType,
  M1MPaymentReceiptStatus,
} from "@/generated/prisma/enums";
import {
  getCurrentCompanyId,
} from "@/lib/tenant";
import {
  paymentReceiptService,
} from "@/services/payment-receipt.service";

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

function normalizeStatus(
  value: string | null,
) {
  if (!value) {
    return undefined;
  }

  const statuses =
    Object.values(
      M1MPaymentReceiptStatus,
    );

  if (
    !statuses.includes(
      value as M1MPaymentReceiptStatus,
    )
  ) {
    throw new Error(
      "Status de comprovante inválido.",
    );
  }

  return value as M1MPaymentReceiptStatus;
}

function normalizeActorType(
  value: unknown,
) {
  if (
    value ===
      M1MAttendanceActorType.AI ||
    value ===
      M1MAttendanceActorType.USER ||
    value ===
      M1MAttendanceActorType.SYSTEM
  ) {
    return value;
  }

  return M1MAttendanceActorType.SYSTEM;
}

function normalizeOptionalDate(
  value: unknown,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date =
    new Date(
      String(value),
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      "Data de pagamento inválida.",
    );
  }

  return date;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const companyId =
      getCurrentCompanyId();

    const status =
      normalizeStatus(
        request.nextUrl.searchParams.get(
          "status",
        ),
      );

    const customerId =
      request.nextUrl.searchParams
        .get("customerId")
        ?.trim() || undefined;

    const receipts =
      await paymentReceiptService.listReceipts(
        companyId,
        status,
        customerId,
      );

    return NextResponse.json(
      receipts,
    );
  } catch (error) {
    console.error(
      "ERRO PAYMENT RECEIPTS GET:",
      error,
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
            error,
            "Erro ao carregar os comprovantes.",
          ),
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const companyId =
      getCurrentCompanyId();

    const body =
      await request.json();

    const receipt =
      await paymentReceiptService.createReceipt(
        companyId,
        {
          customerId:
            body.customerId,
          attendanceId:
            body.attendanceId,
          messageId:
            body.messageId,
          responsibleId:
            body.responsibleId,
          mediaUrl:
            body.mediaUrl,
          mimeType:
            body.mimeType,
          fileName:
            body.fileName,
          amount:
            body.amount,
          paymentMethod:
            body.paymentMethod,
          identifiedBank:
            body.identifiedBank,
          paidAt:
            normalizeOptionalDate(
              body.paidAt,
            ),
          observations:
            body.observations,
          rejectionReason:
            body.rejectionReason,
          actorType:
            normalizeActorType(
              body.actorType,
            ),
          actorId:
            body.actorId,
        },
      );

    return NextResponse.json(
      receipt,
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "ERRO PAYMENT RECEIPTS POST:",
      error,
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
            error,
            "Erro ao criar o comprovante.",
          ),
      },
      {
        status: 500,
      },
    );
  }
}
