"use client";

import { useEffect, useState } from "react";

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

const mediaCache = new Map<string, MediaResponse>();

function normalizeMediaResponse(
  data: RawMediaResponse,
): MediaResponse {
  let normalizedSize: number | null = null;

  if (typeof data.size === "number") {
    normalizedSize = data.size;
  } else if (
    data.size &&
    typeof data.size === "object" &&
    typeof data.size.fileLength?.low === "number"
  ) {
    normalizedSize = data.size.fileLength.low;
  }

  return {
    mediaType: data.mediaType ?? null,
    fileName: data.fileName ?? null,
    caption: data.caption ?? null,
    size: normalizedSize,
    mimetype:
      data.mimetype ?? "application/octet-stream",
    base64: data.base64 ?? "",
  };
}

export default function useMediaLoader(
  messageId: string,
  message: unknown,
) {
  const cached = messageId
    ? mediaCache.get(messageId)
    : undefined;

  const [media, setMedia] = useState<MediaResponse | null>(
    cached ?? null,
  );

  const [loading, setLoading] = useState(
    Boolean(messageId && message && !cached),
  );

  const [error, setError] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!messageId || !message) {
      setLoading(false);
      setError(false);

      return () => {
        isActive = false;
      };
    }

    const cachedMedia = mediaCache.get(messageId);

    if (cachedMedia) {
      setMedia(cachedMedia);
      setLoading(false);
      setError(false);

      return () => {
        isActive = false;
      };
    }

    async function load() {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch("/api/chat/media", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
          }),
          cache: "no-store",
        });

        const responseText = await response.text();

        if (!responseText.trim()) {
          throw new Error(
            "A rota de mídia retornou uma resposta vazia.",
          );
        }

        let rawData: RawMediaResponse;

        try {
          rawData = JSON.parse(
            responseText,
          ) as RawMediaResponse;
        } catch {
          throw new Error(
            "A rota de mídia retornou uma resposta inválida.",
          );
        }

        if (!response.ok) {
          throw new Error(
            rawData.error ||
              "Não foi possível carregar a mídia.",
          );
        }

        const normalizedData =
          normalizeMediaResponse(rawData);

        if (!normalizedData.base64) {
          throw new Error(
            "A mídia foi recebida sem conteúdo.",
          );
        }

        mediaCache.set(messageId, normalizedData);

        if (isActive) {
          setMedia(normalizedData);
        }
      } catch (err) {
        if (!isActive) {
          return;
        }

        console.error("Erro ao carregar mídia:", err);
        setError(true);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [messageId, message]);

  return {
    media,
    loading,
    error,
  };
}
