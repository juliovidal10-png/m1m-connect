import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  M1MUserPermission,
} from "@/generated/prisma/enums";
import {
  AuthorizationError,
  authorizationService,
} from "@/services/auth/authorization.service";
import {
  paymentReceiptService,
} from "@/services/payment-receipt.service";
import {
  receiptStorageService,
} from "@/services/storage/receipt-storage.service";

export const dynamic = "force-dynamic";

function getErrorStatus(
  error: unknown,
) {
  return error instanceof AuthorizationError
    ? error.statusCode
    : 500;
}

function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Erro ao carregar a mídia do comprovante.";
}

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      receiptId: string;
    }>;
  },
) {
  try {
    const authorizedUser =
      await authorizationService.requirePermission(
        M1MUserPermission.VIEW_RECEIPTS,
      );

    const {
      receiptId,
    } = await context.params;

    const receipt =
      await paymentReceiptService.getReceipt(
        authorizedUser.companyId,
        receiptId,
      );

    const mediaUrl =
      receipt.mediaUrl?.trim();

    if (
      !mediaUrl ||
      !receiptStorageService.isManagedUrl(
        mediaUrl,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "A mídia deste comprovante não foi localizada.",
        },
        {
          status: 404,
        },
      );
    }

    const fileName =
      receipt.fileName?.trim() ||
      mediaUrl.split("/").pop() ||
      "comprovante";

    const file =
      await receiptStorageService.read(
        mediaUrl,
      );

    const contentType =
      receipt.mimeType?.trim() ||
      (fileName
        .toLowerCase()
        .endsWith(".pdf")
        ? "application/pdf"
        : "application/octet-stream");

    return new NextResponse(
      new Uint8Array(file),
      {
        status: 200,
        headers: {
          "Content-Type":
            contentType,
          "Content-Length":
            String(file.byteLength),
          "Content-Disposition":
            `inline; filename="${fileName.replaceAll('"', "")}"`,
          "Cache-Control":
            "private, no-store, max-age=0",
          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return NextResponse.json(
        {
          error:
            "Arquivo do comprovante não encontrado no servidor.",
        },
        {
          status: 404,
        },
      );
    }

    console.error(
      "[PAYMENT RECEIPT MEDIA]",
      error,
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
            error,
          ),
      },
      {
        status:
          getErrorStatus(
            error,
          ),
      },
    );
  }
}
