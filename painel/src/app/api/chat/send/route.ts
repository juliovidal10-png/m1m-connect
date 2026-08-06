import { NextResponse } from "next/server";

type ReplyMessageKey = {
  id?: unknown;
  remoteJid?: unknown;
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

const INSTANCE_NAME =
  process.env.INSTANCE_NAME?.trim() ||
  process.env.DEFAULT_INSTANCE?.trim() ||
  "Financeiro";

export async function POST(
  request: Request,
) {
  try {
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
                quotedRemoteJid,
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
        `${API_URL}/message/sendText/${INSTANCE_NAME}`,
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
          instanceName:
            INSTANCE_NAME,
        },
        {
          status:
            response.status,
        },
      );
    }

    return NextResponse.json({
      success: true,
      instanceName:
        INSTANCE_NAME,
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
