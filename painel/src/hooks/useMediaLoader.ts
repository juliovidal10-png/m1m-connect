"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type MediaResponse = {
  mediaType: string | null;
  fileName: string | null;
  caption: string | null;
  size: number | null;
  mimetype: string;
  base64: string;
};

type RawMediaResponse = {
  mediaType?: string | null;
  fileName?: string | null;
  caption?: string | null;
  size?:
    | number
    | {
        fileLength?: {
          low?: number;
        };
      }
    | null;
  mimetype?: string | null;
  base64?: string | null;
  error?: string;
};

const mediaCache =
  new Map<string, MediaResponse>();

const failedMediaCache =
  new Map<
    string,
    {
      failedAt: number;
      reason: string;
    }
  >();

const RETRY_DELAY_MS = 350;
const REQUEST_TIMEOUT_MS = 12000;
const FAILURE_COOLDOWN_MS = 30000;

function normalizeMediaResponse(
  data: RawMediaResponse,
): MediaResponse {
  let normalizedSize: number | null =
    null;

  if (typeof data.size === "number") {
    normalizedSize = data.size;
  } else if (
    data.size &&
    typeof data.size === "object" &&
    typeof data.size.fileLength?.low ===
      "number"
  ) {
    normalizedSize =
      data.size.fileLength.low;
  }

  return {
    mediaType:
      data.mediaType ?? null,
    fileName:
      data.fileName ?? null,
    caption:
      data.caption ?? null,
    size: normalizedSize,
    mimetype:
      data.mimetype ??
      "application/octet-stream",
    base64:
      data.base64 ?? "",
  };
}

function wait(milliseconds: number) {
  return new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

async function requestMedia(
  message: unknown,
  signal: AbortSignal,
) {
  const response = await fetch(
    "/api/chat/media",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        message,
      }),
      cache: "no-store",
      signal,
    },
  );

  const responseText =
    await response.text();

  if (!responseText.trim()) {
    return {
      ok: false,
      status: response.status,
      data: null as RawMediaResponse | null,
      reason:
        "A rota de mídia retornou uma resposta vazia.",
    };
  }

  let rawData:
    | RawMediaResponse
    | null = null;

  try {
    rawData = JSON.parse(
      responseText,
    ) as RawMediaResponse;
  } catch {
    return {
      ok: false,
      status: response.status,
      data: null,
      reason:
        "A rota de mídia retornou uma resposta inválida.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data: rawData,
      reason:
        rawData.error ||
        "Não foi possível carregar a mídia.",
    };
  }

  const normalizedData =
    normalizeMediaResponse(rawData);

  if (!normalizedData.base64) {
    return {
      ok: false,
      status: response.status,
      data: rawData,
      reason:
        "A mídia foi recebida sem conteúdo.",
    };
  }

  return {
    ok: true,
    status: response.status,
    data: normalizedData,
    reason: "",
  };
}

export default function useMediaLoader(
  messageId: string,
  message: unknown,
) {
  const cached = messageId
    ? mediaCache.get(messageId)
    : undefined;

  const [media, setMedia] =
    useState<MediaResponse | null>(
      cached ?? null,
    );

  const [loading, setLoading] =
    useState(
      Boolean(
        messageId &&
          message &&
          !cached,
      ),
    );

  const [error, setError] =
    useState(false);

  const messageRef =
    useRef(message);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    let isActive = true;

    if (!messageId || !messageRef.current) {
      setLoading(false);
      setError(false);

      return () => {
        isActive = false;
      };
    }

    const cachedMedia =
      mediaCache.get(messageId);

    if (cachedMedia) {
      setMedia(cachedMedia);
      setLoading(false);
      setError(false);

      return () => {
        isActive = false;
      };
    }

    const failedBefore =
      failedMediaCache.get(
        messageId,
      );

    if (
      failedBefore &&
      Date.now() -
        failedBefore.failedAt <
        FAILURE_COOLDOWN_MS
    ) {
      setLoading(false);
      setError(true);

      return () => {
        isActive = false;
      };
    }

    async function load() {
      setLoading(true);
      setError(false);

      let finalReason =
        "Não foi possível carregar a mídia.";

      for (
        let attempt = 1;
        attempt <= 2;
        attempt += 1
      ) {
        if (!isActive) {
          return;
        }

        const controller =
          new AbortController();

        const timeoutId =
          window.setTimeout(
            () =>
              controller.abort(),
            REQUEST_TIMEOUT_MS,
          );

        try {
          const result =
            await requestMedia(
              messageRef.current,
              controller.signal,
            );

          window.clearTimeout(
            timeoutId,
          );

          if (
            result.ok &&
            result.data
          ) {
            const normalizedData =
              result.data as MediaResponse;

            mediaCache.set(
              messageId,
              normalizedData,
            );

            failedMediaCache.delete(
              messageId,
            );

            if (isActive) {
              setMedia(
                normalizedData,
              );
              setError(false);
              setLoading(false);
            }

            return;
          }

          finalReason =
            result.reason;

          if (
            result.status >= 400 &&
            result.status < 500
          ) {
            break;
          }
        } catch (err) {
          window.clearTimeout(
            timeoutId,
          );

          if (
            err instanceof DOMException &&
            err.name === "AbortError"
          ) {
            finalReason =
              "Tempo limite ao carregar a mídia.";
          } else {
            finalReason =
              err instanceof Error
                ? err.message
                : "Falha ao carregar a mídia.";
          }
        }

        if (attempt < 2) {
          await wait(
            RETRY_DELAY_MS,
          );
        }
      }

      failedMediaCache.set(
        messageId,
        {
          failedAt:
            Date.now(),
          reason:
            finalReason,
        },
      );

      if (isActive) {
        setMedia(null);
        setError(true);
        setLoading(false);
      }

      if (
        process.env.NODE_ENV ===
        "development"
      ) {
        console.warn(
          "[M1M Media] mídia indisponível:",
          {
            messageId,
            reason:
              finalReason,
          },
        );
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [messageId]);

  return {
    media,
    loading,
    error,
  };
}
