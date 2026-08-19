import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  M1MUserPermission,
} from "@/generated/prisma/enums";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  AuthorizationError,
  authorizationService,
} from "@/services/auth/authorization.service";
import {
  prisma,
} from "@/lib/prisma";
import {
  messageService,
} from "@/services/message.service";

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

type DeleteMessageRequest = {
  id?: unknown;
  evolutionMessageId?: unknown;
  remoteJid?: unknown;
  fromMe?: unknown;
  participant?: unknown;
};

function normalizeText(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue || null;
}

function parseResponseBody(
  value: string,
): unknown {
  if (!value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function DELETE(
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

    const authorizedUser =
      await authorizationService.requirePermission(
        M1MUserPermission.DELETE_MESSAGES,
      );

    const companyId =
      authorizedUser.companyId;

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
      return NextResponse.json(
        {
          error:
            "A empresa não possui WhatsApp configurado.",
        },
        { status: 400 },
      );
    }

    let body: DeleteMessageRequest;

    try {
      body =
        (await request.json()) as DeleteMessageRequest;
    } catch {
      return NextResponse.json(
        {
          error:
            "Os dados da mensagem são inválidos.",
        },
        { status: 400 },
      );
    }

    const id =
      normalizeText(body.id);

    const evolutionMessageId =
      normalizeText(
        body.evolutionMessageId,
      ) ||
      id;

    const remoteJid =
      normalizeText(
        body.remoteJid,
      );

    const participant =
      normalizeText(
        body.participant,
      );

    if (!evolutionMessageId) {
      return NextResponse.json(
        {
          error:
            "O identificador real da mensagem no WhatsApp é obrigatório.",
        },
        { status: 400 },
      );
    }

    if (!remoteJid) {
      return NextResponse.json(
        {
          error:
            "A conversa da mensagem não foi identificada.",
        },
        { status: 400 },
      );
    }

    if (body.fromMe !== true) {
      return NextResponse.json(
        {
          error:
            "Somente mensagens enviadas pela empresa podem ser apagadas para o cliente.",
        },
        { status: 400 },
      );
    }

    const evolutionBody = {
      id: evolutionMessageId,
      remoteJid,
      fromMe: true,
      ...(participant
        ? { participant }
        : {}),
    };

    const response = await fetch(
      `${API_URL}/chat/deleteMessageForEveryone/${instanceName}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type":
            "application/json",
          apikey:
            API_KEY,
        },
        body:
          JSON.stringify(
            evolutionBody,
          ),
        cache:
          "no-store",
      },
    );

    const responseText =
      await response.text();

    const data =
      parseResponseBody(
        responseText,
      );

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "Não foi possível apagar a mensagem para o cliente.",
          evolutionStatus:
            response.status,
          details:
            data,
        },
        {
          status:
            response.status,
        },
      );
    }

    await messageService.markMessageAsRevoked(
      companyId,
      instanceName,
      evolutionMessageId,
    );

    return NextResponse.json({
      success: true,
      evolutionMessageId,
      data,
    });
  } catch (error) {
    console.error(
      "[APAGAR MENSAGEM]",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao apagar mensagem.",
      },
      { status: error instanceof AuthorizationError ? error.statusCode : 500 },
    );
  }
}
