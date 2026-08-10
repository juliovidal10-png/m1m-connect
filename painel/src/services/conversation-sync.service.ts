import {
  M1MMessageDirection,
  M1MMessageType,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { getMessages } from "@/lib/evolution";
import { customerRepository } from "@/repositories/customer.repository";
import { attendanceService } from "@/services/attendance.service";
import {
  messageService,
  REVOKED_MESSAGE_CONTENT,
} from "@/services/message.service";

const DEFAULT_INSTANCE =
  process.env.INSTANCE_NAME?.trim() ||
  process.env.DEFAULT_INSTANCE?.trim() ||
  "Financeiro";

type UnknownRecord = Record<string, unknown>;

type NormalizedEvolutionMessage = {
  evolutionMessageId: string;
  remoteJid: string;
  direction: M1MMessageDirection;
  type: M1MMessageType;
  fromMe: boolean;
  content: string | null;
  mediaUrl: string | null;
  mimeType: string | null;
  sentAt: Date;
  rawPayload: Prisma.InputJsonValue;
  pushName: string | null;
};

type RevokeMessageInfo = {
  targetMessageId: string;
  targetKey: UnknownRecord;
  rawMessage: unknown;
};

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getRecord(
  value: unknown,
): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function getText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function getBoolean(
  value: unknown,
  fallback = false,
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function getMessageDate(value: unknown): Date {
  const numericValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    Number.isFinite(numericValue) &&
    numericValue > 0
  ) {
    const milliseconds =
      numericValue < 10_000_000_000
        ? numericValue * 1000
        : numericValue;

    const date = new Date(milliseconds);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return new Date();
}

function toJsonValue(
  value: unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value ?? {}),
  ) as Prisma.InputJsonValue;
}

function isRevokeProtocolType(
  value: unknown,
): boolean {
  return (
    value === "REVOKE" ||
    value === 0 ||
    value === "0"
  );
}

function getRevokeMessageInfo(
  rawMessage: unknown,
): RevokeMessageInfo | null {
  const record =
    getRecord(rawMessage);

  const message =
    getRecord(record?.message);

  const protocolMessage =
    getRecord(
      message?.protocolMessage,
    );

  if (
    !protocolMessage ||
    !isRevokeProtocolType(
      protocolMessage.type,
    )
  ) {
    return null;
  }

  const targetKey =
    getRecord(
      protocolMessage.key,
    );

  const targetMessageId =
    getText(targetKey?.id);

  if (
    !targetKey ||
    !targetMessageId
  ) {
    return null;
  }

  return {
    targetMessageId,
    targetKey,
    rawMessage,
  };
}

function createDeletedRawMessage(
  sourceMessage: unknown,
  targetKey?: UnknownRecord,
): unknown {
  const record =
    getRecord(sourceMessage);

  if (!record) {
    return sourceMessage;
  }

  const originalKey =
    getRecord(record.key);

  return {
    ...record,
    key:
      targetKey ||
      originalKey ||
      {},
    messageType:
      "conversation",
    message: {
      conversation:
        REVOKED_MESSAGE_CONTENT,
    },
  };
}

function applyRevokeEvents(
  rawMessages: unknown[],
): unknown[] {
  const revokeInfos =
    rawMessages
      .map(getRevokeMessageInfo)
      .filter(
        (
          info,
        ): info is RevokeMessageInfo =>
          info !== null,
      );

  if (
    revokeInfos.length === 0
  ) {
    return rawMessages;
  }

  const revokeByTargetId =
    new Map(
      revokeInfos.map(
        (info) => [
          info.targetMessageId,
          info,
        ],
      ),
    );

  const visibleMessages: unknown[] =
    [];

  const visibleIds =
    new Set<string>();

  for (
    const rawMessage of rawMessages
  ) {
    if (
      getRevokeMessageInfo(
        rawMessage,
      )
    ) {
      continue;
    }

    const record =
      getRecord(rawMessage);

    const key =
      getRecord(record?.key);

    const messageId =
      getText(key?.id);

    if (
      messageId &&
      revokeByTargetId.has(
        messageId,
      )
    ) {
      visibleMessages.push(
        createDeletedRawMessage(
          rawMessage,
        ),
      );

      visibleIds.add(
        messageId,
      );

      continue;
    }

    visibleMessages.push(
      rawMessage,
    );

    if (messageId) {
      visibleIds.add(
        messageId,
      );
    }
  }

  for (
    const info of revokeInfos
  ) {
    if (
      visibleIds.has(
        info.targetMessageId,
      )
    ) {
      continue;
    }

    visibleMessages.push(
      createDeletedRawMessage(
        info.rawMessage,
        info.targetKey,
      ),
    );
  }

  return visibleMessages;
}

function mapMessageType(
  messageType: string | null,
): M1MMessageType {
  switch (messageType) {
    case "conversation":
    case "extendedTextMessage":
    case "buttonsResponseMessage":
    case "listResponseMessage":
    case "templateMessage":
      return M1MMessageType.TEXT;

    case "imageMessage":
      return M1MMessageType.IMAGE;

    case "videoMessage":
      return M1MMessageType.VIDEO;

    case "audioMessage":
      return M1MMessageType.AUDIO;

    case "documentMessage":
    case "documentWithCaptionMessage":
      return M1MMessageType.DOCUMENT;

    case "locationMessage":
    case "liveLocationMessage":
      return M1MMessageType.LOCATION;

    case "contactMessage":
    case "contactsArrayMessage":
      return M1MMessageType.CONTACT;

    case "stickerMessage":
      return M1MMessageType.STICKER;

    case "reactionMessage":
      return M1MMessageType.REACTION;

    default:
      return M1MMessageType.UNKNOWN;
  }
}

function extractContent(
  message: UnknownRecord,
  messageType: string | null,
): string | null {
  const conversation = getText(
    message.conversation,
  );

  if (conversation) {
    return conversation;
  }

  const extendedTextMessage = getRecord(
    message.extendedTextMessage,
  );

  const extendedText = getText(
    extendedTextMessage?.text,
  );

  if (extendedText) {
    return extendedText;
  }

  const imageMessage = getRecord(
    message.imageMessage,
  );

  const imageCaption = getText(
    imageMessage?.caption,
  );

  if (imageCaption) {
    return imageCaption;
  }

  const videoMessage = getRecord(
    message.videoMessage,
  );

  const videoCaption = getText(
    videoMessage?.caption,
  );

  if (videoCaption) {
    return videoCaption;
  }

  const documentMessage = getRecord(
    message.documentMessage,
  );

  const documentText =
    getText(documentMessage?.caption) ||
    getText(documentMessage?.fileName) ||
    getText(documentMessage?.title);

  if (documentText) {
    return documentText;
  }

  const templateMessage = getRecord(
    message.templateMessage,
  );

  const hydratedTemplate = getRecord(
    templateMessage?.hydratedTemplate,
  );

  const hydratedFourRowTemplate = getRecord(
    templateMessage?.hydratedFourRowTemplate,
  );

  const templateText =
    getText(
      hydratedTemplate?.hydratedContentText,
    ) ||
    getText(
      hydratedFourRowTemplate?.hydratedContentText,
    );

  if (templateText) {
    return templateText;
  }

  const buttonsResponseMessage = getRecord(
    message.buttonsResponseMessage,
  );

  const buttonText =
    getText(
      buttonsResponseMessage?.selectedDisplayText,
    ) ||
    getText(
      buttonsResponseMessage?.selectedButtonId,
    );

  if (buttonText) {
    return buttonText;
  }

  const listResponseMessage = getRecord(
    message.listResponseMessage,
  );

  const singleSelectReply = getRecord(
    listResponseMessage?.singleSelectReply,
  );

  const listText =
    getText(listResponseMessage?.title) ||
    getText(
      singleSelectReply?.selectedRowId,
    );

  if (listText) {
    return listText;
  }

  const reactionMessage = getRecord(
    message.reactionMessage,
  );

  const reactionText = getText(
    reactionMessage?.text,
  );

  if (reactionText) {
    return reactionText;
  }

  switch (messageType) {
    case "imageMessage":
      return "[Imagem]";

    case "videoMessage":
      return "[Vídeo]";

    case "audioMessage":
      return "[Áudio]";

    case "documentMessage":
    case "documentWithCaptionMessage":
      return "[Documento]";

    case "locationMessage":
    case "liveLocationMessage":
      return "[Localização]";

    case "contactMessage":
    case "contactsArrayMessage":
      return "[Contato]";

    case "stickerMessage":
      return "[Figurinha]";

    case "reactionMessage":
      return "[Reação]";

    default:
      return null;
  }
}

function getTypedMessageRecord(
  message: UnknownRecord,
  messageType: string | null,
): UnknownRecord | null {
  if (!messageType) {
    return null;
  }

  return getRecord(message[messageType]);
}

function normalizeEvolutionMessage(
  rawMessage: unknown,
): NormalizedEvolutionMessage | null {
  const record = getRecord(rawMessage);

  if (!record) {
    return null;
  }

  const key = getRecord(record.key);
  const message = getRecord(record.message);

  if (!key || !message) {
    return null;
  }

  const revokeInfo =
    getRevokeMessageInfo(
      rawMessage,
    );

  if (revokeInfo) {
    const revokeRemoteJid =
      getText(
        revokeInfo.targetKey
          .remoteJid,
      ) ||
      getText(key.remoteJid);

    if (!revokeRemoteJid) {
      return null;
    }

    const revokeFromMe =
      getBoolean(
        revokeInfo.targetKey
          .fromMe,
      );

    return {
      evolutionMessageId:
        revokeInfo.targetMessageId,
      remoteJid:
        revokeRemoteJid,
      direction:
        revokeFromMe
          ? M1MMessageDirection.OUT
          : M1MMessageDirection.IN,
      type:
        M1MMessageType.TEXT,
      fromMe:
        revokeFromMe,
      content:
        REVOKED_MESSAGE_CONTENT,
      mediaUrl: null,
      mimeType: null,
      sentAt:
        getMessageDate(
          record.messageTimestamp,
        ),
      rawPayload:
        toJsonValue(
          rawMessage,
        ),
      pushName:
        getText(
          record.pushName,
        ),
    };
  }

  const evolutionMessageId = getText(key.id);
  const primaryRemoteJid = getText(
    key.remoteJid,
  );
  const alternateRemoteJid = getText(
    key.remoteJidAlt,
  );

  const remoteJid =
    primaryRemoteJid?.endsWith("@lid") &&
    alternateRemoteJid?.endsWith(
      "@s.whatsapp.net",
    )
      ? alternateRemoteJid
      : primaryRemoteJid;

  if (!evolutionMessageId || !remoteJid) {
    return null;
  }

  const fromMe = getBoolean(key.fromMe);
  const messageType = getText(
    record.messageType,
  );

  const typedMessage = getTypedMessageRecord(
    message,
    messageType,
  );

  const mediaUrl =
    getText(typedMessage?.url) ||
    getText(typedMessage?.directPath);

  const mimeType = getText(
    typedMessage?.mimetype,
  );

  return {
    evolutionMessageId,
    remoteJid,
    direction: fromMe
      ? M1MMessageDirection.OUT
      : M1MMessageDirection.IN,
    type: mapMessageType(messageType),
    fromMe,
    content: extractContent(
      message,
      messageType,
    ),
    mediaUrl,
    mimeType,
    sentAt: getMessageDate(
      record.messageTimestamp,
    ),
    rawPayload: toJsonValue(record),
    pushName: getText(record.pushName),
  };
}

function extractPhone(
  remoteJid: string,
): string | null {
  if (!remoteJid.endsWith("@s.whatsapp.net")) {
    return null;
  }

  const phone = remoteJid.replace(
    "@s.whatsapp.net",
    "",
  );

  return phone || null;
}

export const conversationSyncService = {
  normalizeMessage(rawMessage: unknown) {
    return normalizeEvolutionMessage(rawMessage);
  },

  async syncConversation(
    remoteJid: string,
    instanceName: string,
    companyId: string,
  ) {
    const normalizedRemoteJid = remoteJid.trim();

    if (!normalizedRemoteJid) {
      throw new Error(
        "A conversa não foi identificada.",
      );
    }

    const resolvedCompanyId =
      companyId.trim();

    if (!resolvedCompanyId) {
      throw new Error(
        "A empresa não foi identificada.",
      );
    }

    const primaryRawMessages = (
      await getMessages(
        normalizedRemoteJid,
        instanceName,
      )
    ) as unknown[];

    const primaryNormalizedMessages =
      primaryRawMessages
        .map(normalizeEvolutionMessage)
        .filter(
          (
            message,
          ): message is NormalizedEvolutionMessage =>
            message !== null,
        );

    const canonicalRemoteJid =
      primaryNormalizedMessages.find(
        (message) =>
          message.remoteJid.endsWith(
            "@s.whatsapp.net",
          ),
      )?.remoteJid ??
      normalizedRemoteJid;

    const alternateRawMessages =
      canonicalRemoteJid !==
      normalizedRemoteJid
        ? (
            await getMessages(
              canonicalRemoteJid,
              instanceName,
            )
          ) as unknown[]
        : [];

    const rawMessageMap =
      new Map<string, unknown>();

    for (const rawMessage of [
      ...primaryRawMessages,
      ...alternateRawMessages,
    ]) {
      const record =
        getRecord(rawMessage);

      const key =
        getRecord(record?.key);

      const messageId =
        getText(key?.id);

      if (messageId) {
        rawMessageMap.set(
          messageId,
          rawMessage,
        );
      }
    }

    const rawMessages =
      Array.from(
        rawMessageMap.values(),
      );

    const visibleRawMessages =
      applyRevokeEvents(
        rawMessages,
      );

    const normalizedMessages = rawMessages
      .map(normalizeEvolutionMessage)
      .filter(
        (
          message,
        ): message is NormalizedEvolutionMessage =>
          message !== null,
      )
      .sort(
        (firstMessage, secondMessage) =>
          firstMessage.sentAt.getTime() -
          secondMessage.sentAt.getTime(),
      );

    const contactName =
      normalizedMessages.find(
        (message) =>
          !message.fromMe &&
          message.pushName,
      )?.pushName ?? null;

    const customer =
      await customerRepository.upsert({
        companyId: resolvedCompanyId,
        remoteJid: canonicalRemoteJid,
        name: contactName,
        phone: extractPhone(
          canonicalRemoteJid,
        ),
      });

    const activeAttendance =
      await attendanceService.getOpenAttendanceByCustomer(
        resolvedCompanyId,
        customer.id,
      );

    for (const message of normalizedMessages) {
      const belongsToActiveAttendance =
        activeAttendance &&
        message.sentAt >=
          activeAttendance.startedAt;

      await messageService.registerMessage({
        companyId: resolvedCompanyId,
        customerId: customer.id,
        attendanceId:
          belongsToActiveAttendance
            ? activeAttendance.id
            : null,
        instanceName,
        evolutionMessageId:
          message.evolutionMessageId,
        remoteJid: message.remoteJid,
        direction: message.direction,
        type: message.type,
        fromMe: message.fromMe,
        content: message.content,
        mediaUrl: message.mediaUrl,
        mimeType: message.mimeType,
        rawPayload: message.rawPayload,
        sentAt: message.sentAt,
      });
    }

    const storedMessages =
      await messageService.listMessagesByCustomer(
        resolvedCompanyId,
        customer.id,
      );

    const revokedMessageIds =
      new Set(
        storedMessages
          .filter(
            (message) =>
              message.content ===
              REVOKED_MESSAGE_CONTENT,
          )
          .map(
            (message) =>
              message.evolutionMessageId,
          ),
      );

    return visibleRawMessages.filter(
      (rawMessage) => {
        const record =
          getRecord(rawMessage);

        const key =
          getRecord(record?.key);

        const messageId =
          getText(key?.id);

        return (
          !messageId ||
          !revokedMessageIds.has(
            messageId,
          )
        );
      },
    );
  },

  async syncIncomingMessage(
    rawMessage: unknown,
    instanceName: string,
    companyId: string,
  ) {
    const message =
      normalizeEvolutionMessage(rawMessage);

    if (!message) {
      throw new Error(
        "A mensagem recebida possui formato inválido.",
      );
    }

    const resolvedCompanyId =
      companyId.trim();

    if (!resolvedCompanyId) {
      throw new Error(
        "A empresa não foi identificada.",
      );
    }

    const customer =
      await customerRepository.upsert({
        companyId: resolvedCompanyId,
        remoteJid: message.remoteJid,
        name: message.fromMe
          ? null
          : message.pushName,
        phone: extractPhone(
          message.remoteJid,
        ),
      });

    const attendance =
      await attendanceService.getOpenAttendanceByCustomer(
        resolvedCompanyId,
        customer.id,
      );

    return messageService.registerMessage({
      companyId: resolvedCompanyId,
      customerId: customer.id,
      attendanceId: attendance?.id ?? null,
      instanceName,
      evolutionMessageId:
        message.evolutionMessageId,
      remoteJid: message.remoteJid,
      direction: message.direction,
      type: message.type,
      fromMe: message.fromMe,
      content: message.content,
      mediaUrl: message.mediaUrl,
      mimeType: message.mimeType,
      rawPayload: message.rawPayload,
      sentAt: message.sentAt,
    });
  },
};

