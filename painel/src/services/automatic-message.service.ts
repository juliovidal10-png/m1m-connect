import {
  M1MMessageDirection,
  M1MMessageType,
} from "@/generated/prisma/enums";
import type {
  Prisma,
} from "@/generated/prisma/client";
import {
  sendTextMessage,
} from "@/lib/evolution";
import {
  automaticOutgoingRegistryService,
} from "@/services/automatic-outgoing-registry.service";
import {
  messageService,
} from "@/services/message.service";

type UnknownRecord =
  Record<string, unknown>;

type SendAutomaticMessageInput = {
  companyId: string;
  customerId: string;
  attendanceId?: string | null;
  instanceName: string;
  remoteJid: string;
  text: string;
};

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

function getMessageId(
  response: unknown,
) {
  const record =
    isRecord(response)
      ? response
      : null;

  const key =
    isRecord(record?.key)
      ? record.key
      : null;

  return getText(key?.id);
}

function getRemoteJid(
  response: unknown,
  fallbackRemoteJid: string,
) {
  const record =
    isRecord(response)
      ? response
      : null;

  const key =
    isRecord(record?.key)
      ? record.key
      : null;

  return (
    getText(key?.remoteJid) ||
    fallbackRemoteJid
  );
}

function getTimestamp(
  response: unknown,
) {
  const record =
    isRecord(response)
      ? response
      : null;

  const timestamp =
    Number(
      record?.messageTimestamp,
    );

  if (
    Number.isFinite(timestamp) &&
    timestamp > 0
  ) {
    return new Date(
      timestamp * 1000,
    );
  }

  return new Date();
}

export const automaticMessageService = {
  async sendText(
    input: SendAutomaticMessageInput,
  ) {
    const signature =
      automaticOutgoingRegistryService.registerPending(
        input.instanceName,
        input.remoteJid,
        input.text,
      );

    try {
      const response =
        await sendTextMessage(
          input.remoteJid,
          input.text,
          input.instanceName,
        );

      const evolutionMessageId =
        getMessageId(response);

      if (!evolutionMessageId) {
        throw new Error(
          "A Evolution não retornou o identificador da mensagem automática.",
        );
      }

      automaticOutgoingRegistryService.confirmMessageId(
        signature,
        input.instanceName,
        evolutionMessageId,
      );

      await messageService.registerMessage({
        companyId:
          input.companyId,
        customerId:
          input.customerId,
        attendanceId:
          input.attendanceId ?? null,
        instanceName:
          input.instanceName,
        evolutionMessageId,
        remoteJid:
          getRemoteJid(
            response,
            input.remoteJid,
          ),
        direction:
          M1MMessageDirection.OUT,
        type:
          M1MMessageType.TEXT,
        fromMe: true,
        content:
          input.text,
        rawPayload:
          response as Prisma.InputJsonValue,
        sentAt:
          getTimestamp(response),
        processedAt:
          new Date(),
      });

      return {
        response,
        evolutionMessageId,
      };
    } catch (error) {
      automaticOutgoingRegistryService.cancel(
        signature,
      );

      throw error;
    }
  },
};
