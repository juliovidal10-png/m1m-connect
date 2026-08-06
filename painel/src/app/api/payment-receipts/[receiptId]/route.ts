import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  M1MAttendanceActorType,
} from "@/generated/prisma/enums";
import {
  getCurrentCompanyId,
} from "@/lib/tenant";
import {
  paymentReceiptService,
} from "@/services/payment-receipt.service";

type RouteContext = {
  params: Promise<{
    receiptId: string;
  }>;
};

type ReceiptAction =
  | "UPDATE_DETAILS"
  | "CLASSIFY"
  | "START_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "AWAIT_NEW_RECEIPT"
  | "MARK_CUSTOMER_NOTIFIED"
  | "FINISH";

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

function normalizeAction(
  value: unknown,
): ReceiptAction {
  const actions: ReceiptAction[] = [
    "UPDATE_DETAILS",
    "CLASSIFY",
    "START_REVIEW",
    "APPROVE",
    "REJECT",
    "AWAIT_NEW_RECEIPT",
    "MARK_CUSTOMER_NOTIFIED",
    "FINISH",
  ];

  if (
    typeof value !== "string" ||
    !actions.includes(
      value as ReceiptAction,
    )
  ) {
    throw new Error(
      "Ação do comprovante inválida.",
    );
  }

  return value as ReceiptAction;
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
  context: RouteContext,
) {
  try {
    void request;

    const companyId =
      getCurrentCompanyId();

    const {
      receiptId,
    } =
      await context.params;

    const receipt =
      await paymentReceiptService.getReceipt(
        companyId,
        receiptId,
      );

    return NextResponse.json(
      receipt,
    );
  } catch (error) {
    console.error(
      "ERRO PAYMENT RECEIPT GET:",
      error,
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
            error,
            "Erro ao carregar o comprovante.",
          ),
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const companyId =
      getCurrentCompanyId();

    const {
      receiptId,
    } =
      await context.params;

    const body =
      await request.json();

    const action =
      normalizeAction(
        body.action,
      );

    const actor = {
      actorType:
        normalizeActorType(
          body.actorType,
        ),
      actorId:
        body.actorId ?? null,
    };

    if (
      action ===
      "UPDATE_DETAILS"
    ) {
      const receipt =
        await paymentReceiptService.updateDetails(
          companyId,
          receiptId,
          {
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
          },
          actor,
        );

      return NextResponse.json(
        receipt,
      );
    }

    if (
      action ===
      "CLASSIFY"
    ) {
      const receipt =
        await paymentReceiptService.classifyReceipt(
          companyId,
          receiptId,
          actor,
        );

      return NextResponse.json(
        receipt,
      );
    }

    if (
      action ===
      "START_REVIEW"
    ) {
      const receipt =
        await paymentReceiptService.startReview(
          companyId,
          receiptId,
          body.responsibleId,
        );

      return NextResponse.json(
        receipt,
      );
    }

    if (
      action ===
      "APPROVE"
    ) {
      const receipt =
        await paymentReceiptService.approveReceipt(
          companyId,
          receiptId,
          actor,
        );

      return NextResponse.json(
        receipt,
      );
    }

    if (
      action ===
      "REJECT"
    ) {
      const receipt =
        await paymentReceiptService.rejectReceipt(
          companyId,
          receiptId,
          {
            rejectionReason:
              body.rejectionReason,
            observations:
              body.observations,
          },
          actor,
        );

      return NextResponse.json(
        receipt,
      );
    }

    if (
      action ===
      "AWAIT_NEW_RECEIPT"
    ) {
      const receipt =
        await paymentReceiptService.awaitNewReceipt(
          companyId,
          receiptId,
          actor,
        );

      return NextResponse.json(
        receipt,
      );
    }

    if (
      action ===
      "MARK_CUSTOMER_NOTIFIED"
    ) {
      const receipt =
        await paymentReceiptService.markCustomerNotified(
          companyId,
          receiptId,
          actor,
        );

      return NextResponse.json(
        receipt,
      );
    }

    const receipt =
      await paymentReceiptService.finishReceipt(
        companyId,
        receiptId,
        actor,
      );

    return NextResponse.json(
      receipt,
    );
  } catch (error) {
    console.error(
      "ERRO PAYMENT RECEIPT PATCH:",
      error,
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
            error,
            "Erro ao atualizar o comprovante.",
          ),
      },
      {
        status: 500,
      },
    );
  }
}
