import {
  unlink,
} from "node:fs/promises";
import path from "node:path";

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

function getLocalReceiptFilePath(
  mediaUrl?: string | null,
) {
  const normalized =
    mediaUrl?.trim();

  if (
    !normalized ||
    !normalized.startsWith(
      "/payment-receipts/",
    )
  ) {
    return null;
  }

  const fileName =
    path.basename(
      normalized,
    );

  if (
    !fileName ||
    fileName === "." ||
    fileName === ".."
  ) {
    return null;
  }

  return path.join(
    process.cwd(),
    "public",
    "payment-receipts",
    fileName,
  );
}

async function deleteLocalFile(
  filePath: string | null,
) {
  if (!filePath) {
    return {
      deleted: false,
      reason:
        "NO_LOCAL_FILE" as const,
    };
  }

  try {
    await unlink(
      filePath,
    );

    return {
      deleted: true,
      reason:
        "DELETED" as const,
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {
        deleted: false,
        reason:
          "FILE_NOT_FOUND" as const,
      };
    }

    console.warn(
      "[M1M COMPROVANTE] Registro excluído, mas não foi possível remover o arquivo local:",
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

    const localFilePath =
      getLocalReceiptFilePath(
        receipt.mediaUrl,
      );

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
            localFilePath,
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
