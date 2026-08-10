import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  incomingMessagePipelineService,
} from "@/services/incoming-message-pipeline.service";

type UnknownRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getText(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function getBoolean(
  value: unknown,
) {
  return value === true;
}

function extractMessageText(
  message: UnknownRecord,
) {
  const conversation =
    getText(message.conversation);

  if (conversation) {
    return conversation;
  }

  const extendedTextMessage =
    isRecord(
      message.extendedTextMessage,
    )
      ? message.extendedTextMessage
      : null;

  return getText(
    extendedTextMessage?.text,
  );
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      console.warn(
        "[M1M WEBHOOK] Payload inválido recebido.",
      );

      return NextResponse.json(
        {
          received: false,
          action:
            "INVALID_PAYLOAD",
        },
        {
          status: 400,
        },
      );
    }

    const eventName =
      getText(body.event)
        .toUpperCase()
        .replaceAll(".", "_");

    if (
      eventName &&
      eventName !==
        "MESSAGES_UPSERT"
    ) {
      console.log(
        "[M1M WEBHOOK] Evento ignorado:",
        {
          event:
            eventName,
          instance:
            getText(body.instance) ||
            getText(
              body.instanceName,
            ),
        },
      );

      return NextResponse.json({
        received: true,
        action:
          "EVENT_IGNORED",
        event:
          eventName,
      });
    }

    const data =
      isRecord(body.data)
        ? body.data
        : body;

    const key =
      isRecord(data.key)
        ? data.key
        : null;

    const message =
      isRecord(data.message)
        ? data.message
        : null;

    const instanceName =
      getText(body.instance) ||
      getText(body.instanceName) ||
      getText(data.instance) ||
      getText(data.instance);

    const diagnostic = {
      event:
        eventName ||
        "MESSAGES_UPSERT",
      instance:
        instanceName,
      messageId:
        getText(key?.id),
      remoteJid:
        getText(key?.remoteJid),
      remoteJidAlt:
        getText(
          key?.remoteJidAlt,
        ),
      fromMe:
        getBoolean(
          key?.fromMe,
        ),
      text:
        message
          ? extractMessageText(
              message,
            )
          : "",
    };

    console.log(
      "[M1M WEBHOOK] Mensagem recebida:",
      diagnostic,
    );

    const dryRun =
      request.headers.get(
        "x-m1m-dry-run",
      ) === "true";

    const result =
      await incomingMessagePipelineService.process(
        data,
        instanceName,
        {
          dryRun,
        },
      );

    console.log(
      "[M1M WEBHOOK] Resultado do pipeline:",
      {
        messageId:
          diagnostic.messageId,
        remoteJid:
          diagnostic.remoteJid,
        fromMe:
          diagnostic.fromMe,
        dryRun,
        result,
      },
    );

    return NextResponse.json({
      received: true,
      dryRun,
      ...result,
    });
  } catch (error) {
    console.error(
      "[M1M WEBHOOK] Erro ao processar mensagem:",
      error,
    );

    return NextResponse.json(
      {
        received: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar a mensagem recebida.",
      },
      {
        status: 500,
      },
    );
  }
}
