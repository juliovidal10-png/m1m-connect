import path from "node:path";

import { receiptStorageService } from "@/services/storage/receipt-storage.service";

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

type EvolutionMediaResponse = {
  fileName?: string | null;
  mimetype?: string | null;
  base64?: string | null;
};

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

function removeDataUrlPrefix(
  value: string,
) {
  const commaIndex =
    value.indexOf(",");

  if (
    value.startsWith("data:") &&
    commaIndex >= 0
  ) {
    return value.slice(
      commaIndex + 1,
    );
  }

  return value;
}

async function recoverMedia(
  instanceName: string,
  message: unknown,
) {
  if (!API_URL || !API_KEY) {
    throw new Error(
      "Evolution API não configurada.",
    );
  }

  const response =
    await fetch(
      `${API_URL}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          apikey:
            API_KEY,
        },
        body:
          JSON.stringify({
            message,
            convertToMp4: false,
          }),
        cache:
          "no-store",
      },
    );

  const responseText =
    await response.text();

  let data:
    EvolutionMediaResponse = {};

  if (responseText.trim()) {
    data =
      JSON.parse(
        responseText,
      ) as EvolutionMediaResponse;
  }

  if (!response.ok) {
    throw new Error(
      `Evolution retornou ${response.status} ao recuperar a mídia.`,
    );
  }

  const base64 =
    normalizeOptionalText(
      data.base64,
    );

  if (!base64) {
    throw new Error(
      "A Evolution não retornou o conteúdo da mídia.",
    );
  }

  return {
    base64,
    fileName:
      normalizeOptionalText(
        data.fileName,
      ),
    mimeType:
      normalizeOptionalText(
        data.mimetype,
      ),
  };
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
      await recoverMedia(
        instanceName,
        input.message,
      );

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
const fileBuffer =
      Buffer.from(
        removeDataUrlPrefix(
          media.base64,
        ),
        "base64",
      );

    if (fileBuffer.length === 0) {
      throw new Error(
        "A mídia recuperada está vazia.",
      );
    }
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
