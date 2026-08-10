import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";

import {
  prisma,
} from "@/lib/prisma";

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

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
    __m1mMediaCache?: Map<string, CachedMediaResponse>;
    __m1mMediaInFlight?: Map<string, Promise<MediaResult>>;
  };

const mediaCache =
  globalMediaState.__m1mMediaCache ??
  new Map<string, CachedMediaResponse>();

const mediaInFlight =
  globalMediaState.__m1mMediaInFlight ??
  new Map<string, Promise<MediaResult>>();

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
) {
  if (!isRecord(message)) {
    return null;
  }

  const key =
    isRecord(message.key)
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
    mediaCache.size > MAX_CACHE_ITEMS
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

async function getInstanceName() {
  const companyId =
    await getAuthenticatedCompanyId();

  const company =
    await prisma.m1MCompany.findUnique({
      where: {
        id: companyId,
      },
      select: {
        whatsappInstanceName: true,
      },
    });

  const instanceName =
    company?.whatsappInstanceName?.trim();

  if (!instanceName) {
    throw new Error(
      "A empresa não possui WhatsApp configurado.",
    );
  }

  return instanceName;
}

async function recoverMedia(
  message: unknown,
  convertToMp4: boolean,
  instanceName: string,
): Promise<MediaResult> {
  try {
    const response = await fetch(
      `${API_URL}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          apikey:
            API_KEY!,
        },
        body:
          JSON.stringify({
            message,
            convertToMp4,
          }),
        cache:
          "no-store",
      },
    );

    const responseText =
      await response.text();

    let data: EvolutionMediaResponse = {};

    if (responseText.trim()) {
      data =
        JSON.parse(
          responseText,
        ) as EvolutionMediaResponse;
    }

    console.log(
  "[M1M MEDIA] Resposta Evolution:",
  JSON.stringify(
    {
      status: response.status,
      responseText,
      instanceName,
    },
    null,
    2,
  ),
);

if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error:
          "Não foi possível recuperar a mídia.",
        details:
          data,
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
        base64:
          data.base64,
      },
    };
  } catch {
    return {
      success: false,
      status: 500,
      error:
        "Erro interno ao recuperar a mídia.",
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

    const instanceName =
      await getInstanceName();

    const body =
      (await request.json()) as MediaRequestBody;

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
      getMessageId(
        body.message,
      );

    const cacheKey =
      messageId
        ? `${instanceName}:${messageId}:${body.convertToMp4 ? "mp4" : "original"}`
        : null;

    if (cacheKey) {
      const cached =
        mediaCache.get(cacheKey);

      if (cached) {
        return NextResponse.json(
          cached,
        );
      }
    }

    let mediaPromise =
      cacheKey
        ? mediaInFlight.get(cacheKey)
        : undefined;

    if (!mediaPromise) {
      mediaPromise =
        recoverMedia(
          body.message,
          body.convertToMp4 ?? false,
          instanceName,
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
          error:
            result.error,
          details:
            result.details,
        },
        {
          status:
            result.status,
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
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao recuperar mídia.",
      },
      {
        status: 500,
      },
    );
  }
}

