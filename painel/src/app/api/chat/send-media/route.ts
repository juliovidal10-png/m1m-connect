import {
  NextRequest,
  NextResponse,
} from "next/server";

import { M1MUserPermission } from "@/generated/prisma/enums";
import { authorizationService } from "@/services/auth/authorization.service";
import { prisma } from "@/lib/prisma";
import { manualOutgoingAuthorRegistryService } from "@/services/manual-outgoing-author-registry.service";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  companyRepository,
} from "@/repositories/company.repository";

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

type EvolutionResponseRecord =
  Record<string, unknown>;

function getEvolutionMessageId(
  value: unknown,
): string {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return "";
  }

  const record =
    value as EvolutionResponseRecord;

  const key =
    typeof record.key === "object" &&
    record.key !== null &&
    !Array.isArray(record.key)
      ? (record.key as EvolutionResponseRecord)
      : null;

  return typeof key?.id === "string"
    ? key.id.trim()
    : "";
}
type MediaType =
  | "image"
  | "document"
  | "video"
  | "audio";

const ALLOWED_MEDIA_TYPES =
  new Set([
    "image",
    "document",
    "video",
    "audio",
  ]);

function parseEvolutionResponse(
  value: string,
) {
  if (!value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const authenticatedUser =
      await authorizationService.requirePermission(
        M1MUserPermission.ASSUME_ATTENDANCE,
      );
    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        {
          error:
            "Configuração da Evolution API não encontrada.",
        },
        { status: 500 },
      );
    }

    const companyId =
      await getAuthenticatedCompanyId();

    const messageAuthor =
      await prisma.m1MUser.findFirst({
        where: {
          id: authenticatedUser.userId,
          companyId:
            authenticatedUser.companyId,
        },
        select: {
          name: true,
          displayName: true,
        },
      });

    const messageAuthorName =
      messageAuthor?.displayName?.trim() ||
      messageAuthor?.name?.trim() ||
      "Atendente";

    const company =
      await companyRepository.findById(
        companyId,
      );

    if (!company) {
      return NextResponse.json(
        {
          error:
            "Empresa não encontrada.",
        },
        { status: 404 },
      );
    }

    const instanceName =
      company.whatsappInstanceName?.trim();

    if (!instanceName) {
      return NextResponse.json(
        {
          error:
            "Instância do WhatsApp não configurada para esta empresa.",
        },
        { status: 400 },
      );
    }

    const incomingFormData =
      await request.formData();

    const remoteJid = String(
      incomingFormData.get(
        "remoteJid",
      ) ?? "",
    ).trim();

    const mediaType = String(
      incomingFormData.get(
        "mediatype",
      ) ?? "",
    ).trim() as MediaType;

    const caption = String(
      incomingFormData.get(
        "caption",
      ) ?? "",
    ).trim();

    const ptt =
      String(
        incomingFormData.get(
          "ptt",
        ) ?? "",
      ).trim() === "true";

    const quotedKeyRaw =
      String(
        incomingFormData.get(
          "quotedKey",
        ) ?? "",
      ).trim();

    const quotedMessageRaw =
      String(
        incomingFormData.get(
          "quotedMessage",
        ) ?? "",
      ).trim();

    let quoted:
      | {
          key: {
            id: string;
            remoteJid: string;
            remoteJidAlt?: string;
            fromMe: boolean;
            participant?: string;
          };
          message:
            Record<string, unknown>;
        }
      | undefined;

    if (
      quotedKeyRaw &&
      quotedMessageRaw
    ) {
      try {
        const parsedKey =
          JSON.parse(
            quotedKeyRaw,
          ) as {
            id?: unknown;
            remoteJid?: unknown;
            remoteJidAlt?: unknown;
            fromMe?: unknown;
            participant?: unknown;
          };

        const parsedMessage =
          JSON.parse(
            quotedMessageRaw,
          ) as Record<string, unknown>;

        const quotedId =
          String(
            parsedKey.id ?? "",
          ).trim();

        const quotedRemoteJid =
          String(
            parsedKey.remoteJid ?? "",
          ).trim();
        const quotedRemoteJidAlt =
          String(
            parsedKey.remoteJidAlt ?? "",
          ).trim();


        const quotedParticipant =
          String(
            parsedKey.participant ?? "",
          ).trim();

        if (
          quotedId &&
          quotedRemoteJid
        ) {
          quoted = {
            key: {
              id: quotedId,
              remoteJid:
                quotedRemoteJid.endsWith("@lid") &&
                quotedRemoteJidAlt.endsWith(
                  "@s.whatsapp.net",
                )
                  ? quotedRemoteJidAlt
                  : quotedRemoteJid,
              ...(quotedRemoteJidAlt
                ? {
                    remoteJidAlt:
                      quotedRemoteJidAlt,
                  }
                : {}),
              fromMe:
                parsedKey.fromMe ===
                true,
              ...(quotedParticipant
                ? {
                    participant:
                      quotedParticipant,
                  }
                : {}),
            },
            message:
              parsedMessage,
          };
        }
      } catch {
        quoted =
          undefined;
      }
    }

    const fileValue =
      incomingFormData.get("file");

    if (!remoteJid) {
      return NextResponse.json(
        {
          error:
            "Conversa não identificada.",
        },
        { status: 400 },
      );
    }

    if (
      !ALLOWED_MEDIA_TYPES.has(
        mediaType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "O tipo de mídia informado é inválido.",
        },
        { status: 400 },
      );
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Nenhum arquivo foi selecionado.",
        },
        { status: 400 },
      );
    }

    if (fileValue.size === 0) {
      return NextResponse.json(
        {
          error:
            "O arquivo selecionado está vazio.",
        },
        { status: 400 },
      );
    }

    const fileName =
      fileValue.name || "arquivo";

    const mimeType =
      fileValue.type ||
      "application/octet-stream";

    const fileBuffer =
      Buffer.from(
        await fileValue.arrayBuffer(),
      );

    const base64 =
      fileBuffer.toString("base64");

    const normalizedNumber =
      remoteJid
        .replace("@s.whatsapp.net", "")
        .replace("@g.us", "")
        .trim();

    const evolutionPayload = {
      number: normalizedNumber,
      mediatype: mediaType,
      mimetype: mimeType,
      caption,
      media: base64,
      fileName,
      ...(mediaType === "audio"
        ? { ptt }
        : {}),
      ...(quoted
        ? { quoted }
        : {}),

    };

    const response = await fetch(
      `${API_URL}/message/sendMedia/${encodeURIComponent(
        instanceName,
      )}`,
      {
        method: "POST",
        headers: {
          apikey: API_KEY,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          evolutionPayload,
        ),
        cache: "no-store",
      },
    );

    const responseText =
      await response.text();

    const evolutionData =
      parseEvolutionResponse(
        responseText,
      );

    if (!response.ok) {
      console.error(
        "[ENVIO DE MÍDIA] Evolution recusou o arquivo:",
        JSON.stringify(
          {
            status:
              response.status,
            statusText:
              response.statusText,
            fileName,
            mediaType,
            mimeType,
            remoteJid,
            normalizedNumber,
            instanceName,
            details:
              evolutionData,
          },
          null,
          2,
        ),
      );

      const evolutionMessage =
        typeof evolutionData ===
        "object" &&
        evolutionData !== null &&
        "message" in evolutionData
          ? String(
              (
                evolutionData as {
                  message?: unknown;
                }
              ).message ??
                "",
            )
          : "";

      return NextResponse.json(
        {
          error:
            evolutionMessage ||
            `A Evolution recusou o arquivo ${fileName}.`,
          evolutionStatus:
            response.status,
          details:
            evolutionData,
          instanceName,
        },
        {
          status:
            response.status >= 400 &&
            response.status <= 599
              ? response.status
              : 502,
        },
      );
    }

    const evolutionMessageId =
      getEvolutionMessageId(
        evolutionData,
      );

    if (!evolutionMessageId) {
      console.error(
        "[ENVIO DE MÍDIA] Evolution respondeu sem ID de mensagem:",
        evolutionData,
      );

      return NextResponse.json(
        {
          error:
            "A Evolution não confirmou o envio do arquivo.",
          details:
            evolutionData,
          instanceName,
        },
        {
          status: 502,
        },
      );
    }

    if (evolutionMessageId) {
      manualOutgoingAuthorRegistryService.register(
        instanceName,
        evolutionMessageId,
        authenticatedUser.userId,
        messageAuthorName,
      );
    }
    console.log(
      "[ENVIO DE MÍDIA] Arquivo enviado com sucesso:",
      JSON.stringify(
        {
          fileName,
          mediaType,
          mimeType,
          remoteJid,
          normalizedNumber,
          instanceName,
        },
      ),
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Arquivo enviado com sucesso.",
        instanceName,
        evolution:
          evolutionData,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "[ENVIO DE MÍDIA] Erro interno:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao enviar o arquivo.",
      },
      { status: 500 },
    );
  }
}



