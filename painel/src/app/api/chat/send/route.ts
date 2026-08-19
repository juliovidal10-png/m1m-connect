import { NextResponse } from "next/server";

import { M1MMessageAuthorType, M1MUserPermission } from "@/generated/prisma/enums";
import { authorizationService } from "@/services/auth/authorization.service";
import { prisma } from "@/lib/prisma";
import { manualOutgoingAuthorRegistryService } from "@/services/manual-outgoing-author-registry.service";
import { conversationSyncService } from "@/services/conversation-sync.service";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  companyRepository,
} from "@/repositories/company.repository";

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
type ReplyMessageKey = {
  id?: unknown;
  remoteJid?: unknown;
  remoteJidAlt?: unknown;
  fromMe?: unknown;
  participant?: unknown;
};

type SendMessageRequest = {
  remoteJid?: unknown;
  text?: unknown;
  quotedKey?: ReplyMessageKey | null;
  quotedMessage?: unknown;
};

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

export async function POST(
  request: Request,
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
        {
          status: 500,
        },
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
        {
          status: 404,
        },
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
        {
          status: 400,
        },
      );
    }

    const body =
      (await request.json()) as SendMessageRequest;

    const remoteJid =
      String(
        body.remoteJid ?? "",
      ).trim();

    const text =
      String(
        body.text ?? "",
      ).trim();

    if (!remoteJid) {
      return NextResponse.json(
        {
          error:
            "Conversa não identificada.",
        },
        {
          status: 400,
        },
      );
    }

    if (!text) {
      return NextResponse.json(
        {
          error:
            "Digite uma mensagem.",
        },
        {
          status: 400,
        },
      );
    }

    const quotedKey =
      body.quotedKey &&
      typeof body.quotedKey ===
        "object"
        ? body.quotedKey
        : null;

    const quotedMessage =
      body.quotedMessage &&
      typeof body.quotedMessage ===
        "object"
        ? body.quotedMessage
        : null;

    const quotedId =
      quotedKey
        ? String(
            quotedKey.id ?? "",
          ).trim()
        : "";

    const quotedRemoteJid =
      quotedKey
        ? String(
            quotedKey.remoteJid ??
              "",
          ).trim()
        : "";
    const quotedRemoteJidAlt =
      quotedKey
        ? String(
            quotedKey.remoteJidAlt ??
              "",
          ).trim()
        : "";


    const quotedFromMe =
      quotedKey?.fromMe === true;

    const quotedParticipant =
      quotedKey
        ? String(
            quotedKey.participant ??
              "",
          ).trim()
        : "";

    const quoted =
      quotedId &&
      quotedRemoteJid &&
      quotedMessage
        ? {
            key: {
              id: quotedId,
              remoteJid:
                quotedRemoteJid.endsWith("@lid") &&
                quotedRemoteJidAlt.endsWith(
                  "@s.whatsapp.net",
                )
                  ? quotedRemoteJidAlt
                  : quotedRemoteJid,
              fromMe:
                quotedFromMe,
              ...(quotedParticipant
                ? {
                    participant:
                      quotedParticipant,
                  }
                : {}),
            },
            message:
              quotedMessage,
          }
        : undefined;

    const response =
      await fetch(
        `${API_URL}/message/sendText/${encodeURIComponent(
          instanceName,
        )}`,
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
              number:
                remoteJid,
              text,
              ...(quoted
                ? { quoted }
                : {}),
            }),
        },
      );

    const data =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.message ||
            data?.error ||
            "Não foi possível enviar a mensagem.",
          details:
            data,
          instanceName,
        },
        {
          status:
            response.status,
        },
      );
    }

    const evolutionMessageId =
      getEvolutionMessageId(data);

    if (!evolutionMessageId) {
      console.error(
        "[ENVIO TEXTO] Evolution respondeu sem ID de mensagem:",
        data,
      );

      return NextResponse.json(
        {
          error:
            "A Evolution não confirmou o envio da mensagem.",
          details:
            data,
          instanceName,
        },
        {
          status: 502,
        },
      );
    }

    if (evolutionMessageId) {
      /*
       * Registra a autoria ANTES de sincronizar. Assim, quando o sync
       * encontrar a mensagem enviada, ele consegue identifica-la como
       * envio humano feito pela plataforma.
       */
      manualOutgoingAuthorRegistryService.register(
        instanceName,
        evolutionMessageId,
        authenticatedUser.userId,
        messageAuthorName,
      );

      /*
       * A rota de envio nao pode depender de a tela disparar um sync depois.
       * Sincronizamos a conversa imediatamente para persistir a mensagem OUT
       * no banco usando o fluxo oficial ja existente do M1M Connect.
       */
      await conversationSyncService.syncConversation(
        remoteJid,
        instanceName,
        companyId,
      );

      /*
       * Camada final de seguranca: se o sync persistiu a mensagem antes de
       * consumir a autoria do registry, completamos a autoria pelo ID exato
       * devolvido pela Evolution.
       */
      await prisma.m1MMessage.updateMany({
        where: {
          companyId,
          instanceName,
          evolutionMessageId,
          fromMe: true,
        },
        data: {
          authorType: M1MMessageAuthorType.HUMAN,
          authorId: authenticatedUser.userId,
          authorName: messageAuthorName,
        },
      });
    }
    return NextResponse.json({
      success: true,
      instanceName,
      data,
    });
  } catch (error) {
    console.error(
      "Erro ao enviar mensagem:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao enviar a mensagem.",
      },
      {
        status: 500,
      },
    );
  }
}





