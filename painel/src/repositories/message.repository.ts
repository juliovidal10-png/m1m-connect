import {
  M1MMessageAuthorType,
  M1MMessageDirection,
  M1MMessageType,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type CreateMessageData = {
  companyId: string;
  customerId: string;
  attendanceId?: string | null;
  instanceName: string;
  evolutionMessageId: string;
  remoteJid: string;
  direction: M1MMessageDirection;
  type: M1MMessageType;
  fromMe: boolean;
  authorType?: M1MMessageAuthorType | null;
  authorId?: string | null;
  authorName?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
  rawPayload?: Prisma.InputJsonValue | null;
  sentAt: Date;
  processingStartedAt?: Date | null;
  processedAt?: Date | null;
};

export const messageRepository = {
  async createMessage(data: CreateMessageData) {
    return prisma.m1MMessage.create({
      data: {
        companyId: data.companyId,
        customerId: data.customerId,
        attendanceId: data.attendanceId ?? null,
        instanceName: data.instanceName,
        evolutionMessageId: data.evolutionMessageId,
        remoteJid: data.remoteJid,
        direction: data.direction,
        type: data.type,
        fromMe: data.fromMe,
        authorType: data.authorType ?? null,
        authorId: data.authorId ?? null,
        authorName: data.authorName ?? null,
        content: data.content ?? null,
        mediaUrl: data.mediaUrl ?? null,
        mimeType: data.mimeType ?? null,
        rawPayload: data.rawPayload ?? undefined,
        sentAt: data.sentAt,
        processingStartedAt:
          data.processingStartedAt ?? null,
        processedAt: data.processedAt ?? null,
      },
    });
  },

  async findMessageByEvolutionId(
    companyId: string,
    instanceName: string,
    evolutionMessageId: string,
  ) {
    return prisma.m1MMessage.findUnique({
      where: {
        companyId_instanceName_evolutionMessageId: {
          companyId,
          instanceName,
          evolutionMessageId,
        },
      },
    });
  },

  async markMessageAsRevoked(
    companyId: string,
    instanceName: string,
    evolutionMessageId: string,
    rawPayload?: Prisma.InputJsonValue | null,
  ) {
    return prisma.m1MMessage.update({
      where: {
        companyId_instanceName_evolutionMessageId: {
          companyId,
          instanceName,
          evolutionMessageId,
        },
      },
      data: {
        type: M1MMessageType.TEXT,
        content: "🚫 Esta mensagem foi apagada.",
        mediaUrl: null,
        mimeType: null,
        rawPayload:
          rawPayload ?? undefined,
      },
    });
  },

  async setAuthorship(
    messageId: string,
    authorType: M1MMessageAuthorType,
    authorId?: string | null,
    authorName?: string | null,
  ) {
    return prisma.m1MMessage.update({
      where: {
        id: messageId,
      },
      data: {
        authorType,
        authorId: authorId ?? null,
        authorName: authorName ?? null,
      },
    });
  },
  async listMessagesByCustomer(
    companyId: string,
    customerId: string,
  ) {
    return prisma.m1MMessage.findMany({
      where: {
        companyId,
        customerId,
      },
      orderBy: {
        sentAt: "asc",
      },
    });
  },

  async listMessageIdsByCustomer(
    companyId: string,
    customerId: string,
  ) {
    return prisma.m1MMessage.findMany({
      where: {
        companyId,
        customerId,
      },
      select: {
        evolutionMessageId: true,
      },
    });
  },

  async listRecentMessagesByCustomer(
    companyId: string,
    customerId: string,
    limit: number,
  ) {
    const safeLimit = Math.max(
      1,
      Math.min(Math.trunc(limit), 500),
    );

    const messages =
      await prisma.m1MMessage.findMany({
        where: {
          companyId,
          customerId,
        },
        orderBy: [
          {
            sentAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: safeLimit,
      });

    return messages.reverse();
  },

  async hasAIMessageWithContentByAttendance(
    attendanceId: string,
    content: string,
  ) {
    const message =
      await prisma.m1MMessage.findFirst({
        where: {
          attendanceId,
          fromMe: true,
          authorType:
            M1MMessageAuthorType.AI,
          content,
        },
        select: {
          id: true,
        },
      });

    return Boolean(message);
  },
  async attachMessageToAttendance(
    messageId: string,
    attendanceId: string,
  ) {
    return prisma.m1MMessage.update({
      where: {
        id: messageId,
      },
      data: {
        attendanceId,
      },
    });
  },

  async listMessagesByAttendance(
    attendanceId: string,
  ) {
    return prisma.m1MMessage.findMany({
      where: {
        attendanceId,
      },
      orderBy: {
        sentAt: "asc",
      },
    });
  },

  async claimProcessing(
    messageId: string,
    staleAfterMs = 5 * 60 * 1000,
  ) {
    const staleBefore =
      new Date(Date.now() - staleAfterMs);

    const result =
      await prisma.m1MMessage.updateMany({
        where: {
          id: messageId,
          processedAt: null,
          OR: [
            {
              processingStartedAt: null,
            },
            {
              processingStartedAt: {
                lt: staleBefore,
              },
            },
          ],
        },
        data: {
          processingStartedAt: new Date(),
        },
      });

    return result.count === 1;
  },

  async releaseProcessing(
    messageId: string,
  ) {
    return prisma.m1MMessage.update({
      where: {
        id: messageId,
      },
      data: {
        processingStartedAt: null,
      },
    });
  },
  async markAsProcessed(
    messageId: string,
    processedAt?: Date,
  ) {
    return prisma.m1MMessage.update({
      where: {
        id: messageId,
      },
      data: {
        processingStartedAt: null,
        processedAt: processedAt ?? new Date(),
      },
    });
  },
};

