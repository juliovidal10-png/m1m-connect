import { receiptStorageService } from "@/services/storage/receipt-storage.service";

import {
  paymentReceiptDeletionRepository,
} from "@/repositories/payment-receipt-deletion.repository";

function requireText(
  value: string,
  label: string,
) {
  const normalized =
    value?.trim();

  if (!normalized) {
    throw new Error(
      `${label} não informado.`,
    );
  }

  return normalized;
}

async function deleteLocalFile(
  mediaUrl?: string | null,
) {
  const normalized =
    mediaUrl?.trim();

  if (
    !normalized ||
    !receiptStorageService.isManagedUrl(
      normalized,
    )
  ) {
    return {
      deleted: false,
      reason:
        "NO_LOCAL_FILE" as const,
    };
  }

  try {
    const deleted =
      await receiptStorageService.remove(
        normalized,
      );

    return {
      deleted,
      reason:
        deleted
          ? "DELETED" as const
          : "FILE_NOT_FOUND" as const,
    };
  } catch (error) {
    console.warn(
      "[M1M COMPROVANTE] Registro excluído, mas não foi possível remover o arquivo do storage:",
      error,
    );

    return {
      deleted: false,
      reason:
        "DELETE_FAILED" as const,
    };
  }
}

export const paymentReceiptDeletionService = {
  async deleteReceipt(
    companyId: string,
    receiptId: string,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const normalizedReceiptId =
      requireText(
        receiptId,
        "Comprovante",
      );

    const receipt =
      await paymentReceiptDeletionRepository.findById(
        normalizedCompanyId,
        normalizedReceiptId,
      );

    if (!receipt) {
      throw new Error(
        "Comprovante não encontrado.",
      );
    }
const otherReferences =
      receipt.mediaUrl
        ? await paymentReceiptDeletionRepository.countOtherByMediaUrl(
            normalizedCompanyId,
            receipt.mediaUrl,
            normalizedReceiptId,
          )
        : 0;

    const deletedReceipt =
      await paymentReceiptDeletionRepository.deleteReceipt(
        normalizedCompanyId,
        normalizedReceiptId,
      );

    if (!deletedReceipt) {
      throw new Error(
        "Comprovante não encontrado.",
      );
    }

    const localFile =
      otherReferences === 0
        ? await deleteLocalFile(
            receipt.mediaUrl,
          )
        : {
            deleted: false,
            reason:
              "FILE_STILL_IN_USE" as const,
          };

    return {
      success: true,
      receiptId:
        normalizedReceiptId,
      messagePreserved:
        Boolean(
          receipt.messageId,
        ),
      localFileDeleted:
        localFile.deleted,
      localFileResult:
        localFile.reason,
    };
  },
};
