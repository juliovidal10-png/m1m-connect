import {
  NextRequest,
  NextResponse,
} from "next/server";

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

const INSTANCE_NAME = "Financeiro";

type MediaRequestBody = {
  message?: unknown;
  convertToMp4?: boolean;
};

type EvolutionMediaResponse = {
  mediaType?: string | null;
  fileName?: string | null;
  caption?: string | null;
  size?: unknown;
  mimetype?: string | null;
  base64?: string | null;
};

type CachedMediaResponse = {
  mediaType: string | null;
  fileName: string | null;
  caption: string | null;
  size: unknown;
  mimetype: string;
  base64: string;
};

type MediaResult =
  | {
      success: true;
      status: 200;
      data: CachedMediaResponse;
    }
  | {
      success: false;
      status: number;
      error: string;
      details?: unknown;
    };

const MAX_CACHE_ITEMS = 100;

const globalMediaState =
  globalThis as typeof globalThis & {
    __m1mMediaCache?: Map<
      string,
      CachedMediaResponse
    >;
    __m1mMediaInFlight?: Map<
      string,
      Promise<MediaResult>
    >;
  };

const mediaCache =
  globalMediaState.__m1mMediaCache ??
  new Map<
    string,
    CachedMediaResponse
  >();

const mediaInFlight =
  globalMediaState.__m1mMediaInFlight ??
  new Map<
    string,
    Promise<MediaResult>
  >();

globalMediaState.__m1mMediaCache =
  mediaCache;

globalMediaState.__m1mMediaInFlight =
  mediaInFlight;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getMessageId(
  message: unknown,
): string | null {
  if (!isRecord(message)) {
    return null;
  }

  const key = isRecord(message.key)
    ? message.key
    : null;

  if (
    key &&
    typeof key.id === "string" &&
    key.id.trim()
  ) {
    return key.id.trim();
  }

  if (
    typeof message.id === "string" &&
    message.id.trim()
  ) {
    return message.id.trim();
  }

  return null;
}

function saveInCache(
  cacheKey: string,
  data: CachedMediaResponse,
) {
  if (mediaCache.has(cacheKey)) {
    mediaCache.delete(cacheKey);
  }

  mediaCache.set(
    cacheKey,
    data,
  );

  while (
    mediaCache.size >
    MAX_CACHE_ITEMS
  ) {
    const oldestKey =
      mediaCache.keys().next().value;

    if (
      typeof oldestKey !== "string"
    ) {
      break;
    }

    mediaCache.delete(oldestKey);
  }
}

async function recoverMedia(
  message: unknown,
  convertToMp4: boolean,
): Promise<MediaResult> {
  try {
    const response = await fetch(
      `${API_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          apikey: API_KEY!,
        },
        body: JSON.stringify({
          message,
          convertToMp4,
        }),
        cache: "no-store",
        signal:
          AbortSignal.timeout(
            30000,
          ),
      },
    );

    const responseText =
      await response.text();

    let data: EvolutionMediaResponse =
      {};

    if (
      responseText.trim().length > 0
    ) {
      try {
        data = JSON.parse(
          responseText,
        ) as EvolutionMediaResponse;
      } catch {
        return {
          success: false,
          status: 502,
          error:
            "A Evolution API retornou uma resposta de mídia inválida.",
        };
      }
    }

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error:
          "Não foi possível recuperar a mídia.",
        details: data,
      };
    }

    if (!data.base64) {
      return {
        success: false,
        status: 502,
        error:
          "A Evolution API não retornou o conteúdo da mídia.",
      };
    }

    return {
      success: true,
      status: 200,
      data: {
        mediaType:
          data.mediaType ?? null,
        fileName:
          data.fileName ?? null,
        caption:
          data.caption ?? null,
        size:
          data.size ?? null,
        mimetype:
          data.mimetype ??
          "application/octet-stream",
        base64: data.base64,
      },
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (
        error.name ===
          "TimeoutError" ||
        error.name ===
          "AbortError"
      );

    return {
      success: false,
      status: 500,
      error: isTimeout
        ? "A Evolution API demorou demais para recuperar a mídia."
        : "Erro interno ao recuperar a mídia.",
    };
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        {
          error:
            "Configuração da Evolution API não encontrada.",
        },
        { status: 500 },
      );
    }

    const requestText =
      await request.text();

    if (
      requestText.trim().length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "O corpo da requisição de mídia está vazio.",
        },
        { status: 400 },
      );
    }

    let body: MediaRequestBody;

    try {
      body = JSON.parse(
        requestText,
      ) as MediaRequestBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "O corpo da requisição de mídia é inválido.",
        },
        { status: 400 },
      );
    }

    if (!body.message) {
      return NextResponse.json(
        {
          error:
            "A mensagem de mídia é obrigatória.",
        },
        { status: 400 },
      );
    }

    const messageId =
      getMessageId(body.message);

    const cacheKey = messageId
      ? `${INSTANCE_NAME}:${messageId}:${
          body.convertToMp4
            ? "mp4"
            : "original"
        }`
      : null;

    if (cacheKey) {
      const cached =
        mediaCache.get(cacheKey);

      if (cached) {
        /*
         * Renova a posição do item
         * no cache para funcionar
         * como um cache LRU simples.
         */
        mediaCache.delete(cacheKey);
        mediaCache.set(
          cacheKey,
          cached,
        );

        return NextResponse.json(
          cached,
          {
            headers: {
              "X-M1M-Media-Cache":
                "HIT",
            },
          },
        );
      }
    }

    let mediaPromise =
      cacheKey
        ? mediaInFlight.get(
            cacheKey,
          )
        : undefined;

    if (!mediaPromise) {
      mediaPromise = recoverMedia(
        body.message,
        body.convertToMp4 ??
          false,
      );

      if (cacheKey) {
        mediaInFlight.set(
          cacheKey,
          mediaPromise,
        );
      }
    }

    const result =
      await mediaPromise;

    if (cacheKey) {
      mediaInFlight.delete(
        cacheKey,
      );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          details:
            result.details,
        },
        {
          status: result.status,
        },
      );
    }

    if (cacheKey) {
      saveInCache(
        cacheKey,
        result.data,
      );
    }

    return NextResponse.json(
      result.data,
      {
        headers: {
          "X-M1M-Media-Cache":
            cacheKey
              ? "MISS"
              : "BYPASS",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erro interno ao recuperar mídia:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao recuperar a mídia.",
      },
      { status: 500 },
    );
  }
}
