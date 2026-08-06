import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getCurrentCompanyId } from "@/lib/tenant";
import { messageService } from "@/services/message.service";

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

const INSTANCE_NAME =
  process.env.INSTANCE_NAME ||
  process.env.DEFAULT_INSTANCE ||
  "Financeiro";

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

    console.log(
      "[APAGAR MENSAGEM] Dados recebidos:",
      JSON.stringify(
        {
          id,
          evolutionMessageId,
          remoteJid,
          fromMe:
            body.fromMe,
          participant,
          instance:
            INSTANCE_NAME,
        },
        null,
        2,
      ),
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

    const evolutionBody: {
      id: string;
      remoteJid: string;
      fromMe: true;
      participant?: string;
    } = {
      id: evolutionMessageId,
      remoteJid,
      fromMe: true,
    };

    if (participant) {
      evolutionBody.participant =
        participant;
    }

    console.log(
      "[APAGAR MENSAGEM] Payload enviado à Evolution:",
      JSON.stringify(
        evolutionBody,
        null,
        2,
      ),
    );

    const response = await fetch(
      `${API_URL}/chat/deleteMessageForEveryone/${INSTANCE_NAME}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type":
            "application/json",
          apikey: API_KEY,
        },
        body: JSON.stringify(
          evolutionBody,
        ),
        cache: "no-store",
        signal:
          AbortSignal.timeout(
            15000,
          ),
      },
    );

    const responseText =
      await response.text();

    const data =
      parseResponseBody(
        responseText,
      );

    console.log(
      "[APAGAR MENSAGEM] Resposta da Evolution:",
      JSON.stringify(
        {
          status:
            response.status,
          statusText:
            response.statusText,
          ok:
            response.ok,
          data,
        },
        null,
        2,
      ),
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "Não foi possível apagar a mensagem para o cliente.",
          evolutionStatus:
            response.status,
          details: data,
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

    if (evolutionMessageId) {
      const companyId =
        getCurrentCompanyId();

      await messageService.markMessageAsRevoked(
        companyId,
        INSTANCE_NAME,
        evolutionMessageId,
      );
    }

    return NextResponse.json({
      success: true,
      revokedContent:
        "🚫 Esta mensagem foi apagada.",
      evolutionMessageId,
      data,
    });
  } catch (error) {
    console.error(
      "[APAGAR MENSAGEM] Erro interno:",
      error,
    );

    const isTimeout =
      error instanceof Error &&
      (
        error.name ===
          "TimeoutError" ||
        error.name ===
          "AbortError"
      );

    return NextResponse.json(
      {
        error: isTimeout
          ? "A Evolution API demorou demais para confirmar a exclusão."
          : error instanceof Error
            ? error.message
            : "Erro interno ao apagar a mensagem.",
      },
      { status: 500 },
    );
  }
}
