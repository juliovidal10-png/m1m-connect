import path from "node:path";

import { evolutionMediaService } from "@/services/evolution-media.service";
import { receiptStorageService } from "@/services/storage/receipt-storage.service";


type PersistMediaInput = {
  instanceName: string;
  message: unknown;
  messageId: string;
  fallbackMimeType?: string | null;
  fallbackFileName?: string | null;
};

type PersistedMedia = {
  mediaUrl: string;
  fileName: string;
  mimeType: string;
};

function normalizeOptionalText(
  value?: string | null,
) {
  const normalized =
    value?.trim();

  return normalized || null;
}

function sanitizeFileName(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extensionFromMimeType(
  mimeType: string,
) {
  const normalized =
    mimeType
      .split(";")[0]
      .trim()
      .toLowerCase();

  const knownExtensions:
    Record<string, string> = {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "application/octet-stream":
        "bin",
    };

  return (
    knownExtensions[normalized] ||
    normalized.split("/")[1]?.replace(
      /[^a-z0-9]+/g,
      "",
    ) ||
    "bin"
  );
}


export const paymentReceiptMediaService = {
  async persistFromEvolution(
    input: PersistMediaInput,
  ): Promise<PersistedMedia | null> {
    const instanceName =
      input.instanceName.trim();

    const messageId =
      input.messageId.trim();

    if (
      !instanceName ||
      !messageId ||
      !input.message
    ) {
      return null;
    }

    const media =
      await evolutionMediaService.recover({
        instanceName,
        message: input.message,
        convertToMp4: false,
      });

    const mimeType =
      media.mimeType ||
      normalizeOptionalText(
        input.fallbackMimeType,
      ) ||
      "application/octet-stream";

    const extension =
      extensionFromMimeType(
        mimeType,
      );

    const originalFileName =
      normalizeOptionalText(
        input.fallbackFileName,
      ) ||
      media.fileName;

    const requestedBaseName =
      sanitizeFileName(
        path.basename(
          originalFileName ||
          `comprovante-${messageId}`,
          path.extname(
            originalFileName ||
            "",
          ),
        ),
      ) ||
      `comprovante-${messageId}`;

    const safeFileName =
      `${requestedBaseName}.${extension}`;

    const uniqueFileName =
      `${sanitizeFileName(messageId)}-${safeFileName}`;
    const fileBuffer = media.buffer;
    const stored =
      await receiptStorageService.save({
        fileName: uniqueFileName,
        buffer: fileBuffer,
      });

    return {
      mediaUrl:
        stored.mediaUrl,
      fileName:
        originalFileName ||
        safeFileName,
      mimeType,
    };
  },
};
