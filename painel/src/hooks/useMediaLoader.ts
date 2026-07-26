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

const mediaCache = new Map<string, MediaResponse>();

export default function useMediaLoader(
  messageId: string,
  message: unknown,
) {
  const cached = mediaCache.get(messageId);

  const [media, setMedia] = useState<MediaResponse | null>(
    cached ?? null,
  );

  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cached) return;

    const controller = new AbortController();

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
          signal: controller.signal,
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error);
        }

        mediaCache.set(messageId, data);
        setMedia(data);
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error(err);
        setError(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [messageId]);

  return {
    media,
    loading,
    error,
  };
}