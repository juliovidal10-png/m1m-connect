import {
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
  content?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
  rawPayload?: Prisma.InputJsonValue | null;
  sentAt: Date;
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
        content: data.content ?? null,
        mediaUrl: data.mediaUrl ?? null,
        mimeType: data.mimeType ?? null,
        rawPayload: data.rawPayload ?? undefined,
        sentAt: data.sentAt,
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

  async markAsProcessed(
    messageId: string,
    processedAt?: Date,
  ) {
    return prisma.m1MMessage.update({
      where: {
        id: messageId,
      },
      data: {
        processedAt: processedAt ?? new Date(),
      },
    });
  },
};
