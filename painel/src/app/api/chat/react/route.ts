import {
  NextRequest,
  NextResponse,
} from "next/server";

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

type ReactionRequestBody = {
  remoteJid?: unknown;
  messageId?: unknown;
  fromMe?: unknown;
  participant?: unknown;
  emoji?: unknown;
};

function normalizeText(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function parseEvolutionResponse(value: string): unknown {
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

    const body =
      (await request.json()) as ReactionRequestBody;

    const remoteJid =
      normalizeText(
        body.remoteJid,
      );

    const messageId =
      normalizeText(
        body.messageId,
      );

    const participant =
      normalizeText(
        body.participant,
      );

    const emoji =
      normalizeText(
        body.emoji,
      );

    const fromMe =
      body.fromMe === true;

    if (!remoteJid) {
      return NextResponse.json(
        {
          error:
            "Conversa não identificada.",
        },
        { status: 400 },
      );
    }

    if (!messageId) {
      return NextResponse.json(
        {
          error:
            "Mensagem não identificada.",
        },
        { status: 400 },
      );
    }

    if (!emoji) {
      return NextResponse.json(
        {
          error:
            "Escolha uma reação.",
        },
        { status: 400 },
      );
    }

    const evolutionPayload = {
      key: {
        remoteJid,
        fromMe,
        id: messageId,
        ...(participant
          ? { participant }
          : {}),
      },
      reaction: emoji,
    };

    console.log(
      "[REAÇÃO] Payload enviado à Evolution:",
      JSON.stringify(
        {
          instance:
            instanceName,
          payload:
            evolutionPayload,
        },
        null,
        2,
      ),
    );

    const response =
      await fetch(
        `${API_URL}/message/sendReaction/${instanceName}`,
        {
          method: "POST",
          headers: {
            apikey:
              API_KEY,
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify(
              evolutionPayload,
            ),
          cache:
            "no-store",
        },
      );

    const responseText =
      await response.text();

    const evolutionData =
      parseEvolutionResponse(
        responseText,
      );

    console.log(
      "[REAÇÃO] Resposta da Evolution:",
      JSON.stringify(
        {
          status:
            response.status,
          ok:
            response.ok,
          data:
            evolutionData,
        },
        null,
        2,
      ),
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "A Evolution recusou a reação.",
          evolutionStatus:
            response.status,
          details:
            evolutionData,
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

    return NextResponse.json({
      success:
        true,
      reaction:
        emoji,
      evolution:
        evolutionData,
    });
  } catch (error) {
    console.error(
      "[REAÇÃO] Erro interno:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao enviar a reação.",
      },
      { status: 500 },
    );
  }
}
