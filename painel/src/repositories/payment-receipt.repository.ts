import {
  M1MAttendanceActorType,
  M1MPaymentReceiptEventType,
  M1MPaymentReceiptStatus,
} from "@/generated/prisma/enums";
import type {
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type CreatePaymentReceiptData = {
  companyId: string;
  customerId: string;
  attendanceId?: string | null;
  messageId?: string | null;
  responsibleId?: string | null;
  status?: M1MPaymentReceiptStatus;
  mediaUrl?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  amount?: Prisma.Decimal | number | string | null;
  paymentMethod?: string | null;
  identifiedBank?: string | null;
  paidAt?: Date | null;
  observations?: string | null;
  rejectionReason?: string | null;
};

export type UpdatePaymentReceiptData = {
  responsibleId?: string | null;
  status?: M1MPaymentReceiptStatus;
  mediaUrl?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  amount?: Prisma.Decimal | number | string | null;
  paymentMethod?: string | null;
  identifiedBank?: string | null;
  paidAt?: Date | null;
  observations?: string | null;
  rejectionReason?: string | null;
  classifiedAt?: Date | null;
  reviewStartedAt?: Date | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  customerNotifiedAt?: Date | null;
  finishedAt?: Date | null;
};

export type CreatePaymentReceiptEventData = {
  receiptId: string;
  type: M1MPaymentReceiptEventType;
  actorType: M1MAttendanceActorType;
  actorId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  createdAt?: Date;
};

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue || null;
}

function normalizeOptionalAmount(
  value?:
    | Prisma.Decimal
    | number
    | string
    | null,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return value;
}

function buildUpdateData(
  data: UpdatePaymentReceiptData,
) {
  const updateData: {
    responsibleId?: string | null;
    status?: M1MPaymentReceiptStatus;
    mediaUrl?: string | null;
    mimeType?: string | null;
    fileName?: string | null;
    amount?: Prisma.Decimal | number | string | null;
    paymentMethod?: string | null;
    identifiedBank?: string | null;
    paidAt?: Date | null;
    observations?: string | null;
    rejectionReason?: string | null;
    classifiedAt?: Date | null;
    reviewStartedAt?: Date | null;
    approvedAt?: Date | null;
    rejectedAt?: Date | null;
    customerNotifiedAt?: Date | null;
    finishedAt?: Date | null;
  } = {};

  if (
    data.responsibleId !==
    undefined
  ) {
    updateData.responsibleId =
      data.responsibleId;
  }

  if (
    data.status !==
    undefined
  ) {
    updateData.status =
      data.status;
  }

  if (
    data.mediaUrl !==
    undefined
  ) {
    updateData.mediaUrl =
      normalizeOptionalText(
        data.mediaUrl,
      );
  }

  if (
    data.mimeType !==
    undefined
  ) {
    updateData.mimeType =
      normalizeOptionalText(
        data.mimeType,
      );
  }

  if (
    data.fileName !==
    undefined
  ) {
    updateData.fileName =
      normalizeOptionalText(
        data.fileName,
      );
  }

  if (
    data.amount !==
    undefined
  ) {
    updateData.amount =
      normalizeOptionalAmount(
        data.amount,
      );
  }

  if (
    data.paymentMethod !==
    undefined
  ) {
    updateData.paymentMethod =
      normalizeOptionalText(
        data.paymentMethod,
      );
  }

  if (
    data.identifiedBank !==
    undefined
  ) {
    updateData.identifiedBank =
      normalizeOptionalText(
        data.identifiedBank,
      );
  }

  if (
    data.paidAt !==
    undefined
  ) {
    updateData.paidAt =
      data.paidAt;
  }

  if (
    data.observations !==
    undefined
  ) {
    updateData.observations =
      normalizeOptionalText(
        data.observations,
      );
  }

  if (
    data.rejectionReason !==
    undefined
  ) {
    updateData.rejectionReason =
      normalizeOptionalText(
        data.rejectionReason,
      );
  }

  if (
    data.classifiedAt !==
    undefined
  ) {
    updateData.classifiedAt =
      data.classifiedAt;
  }

  if (
    data.reviewStartedAt !==
    undefined
  ) {
    updateData.reviewStartedAt =
      data.reviewStartedAt;
  }

  if (
    data.approvedAt !==
    undefined
  ) {
    updateData.approvedAt =
      data.approvedAt;
  }

  if (
    data.rejectedAt !==
    undefined
  ) {
    updateData.rejectedAt =
      data.rejectedAt;
  }

  if (
    data.customerNotifiedAt !==
    undefined
  ) {
    updateData.customerNotifiedAt =
      data.customerNotifiedAt;
  }

  if (
    data.finishedAt !==
    undefined
  ) {
    updateData.finishedAt =
      data.finishedAt;
  }

  return updateData;
}

export const paymentReceiptRepository = {
  async create(
    data: CreatePaymentReceiptData,
  ) {
    return prisma.m1MPaymentReceipt.create({
      data: {
        companyId:
          data.companyId,
        customerId:
          data.customerId,
        attendanceId:
          data.attendanceId ?? null,
        messageId:
          data.messageId ?? null,
        responsibleId:
          data.responsibleId ?? null,
        status:
          data.status ??
          M1MPaymentReceiptStatus.RECEIVED,
        mediaUrl:
          normalizeOptionalText(
            data.mediaUrl,
          ),
        mimeType:
          normalizeOptionalText(
            data.mimeType,
          ),
        fileName:
          normalizeOptionalText(
            data.fileName,
          ),
        amount:
          normalizeOptionalAmount(
            data.amount,
          ),
        paymentMethod:
          normalizeOptionalText(
            data.paymentMethod,
          ),
        identifiedBank:
          normalizeOptionalText(
            data.identifiedBank,
          ),
        paidAt:
          data.paidAt ?? null,
        observations:
          normalizeOptionalText(
            data.observations,
          ),
        rejectionReason:
          normalizeOptionalText(
            data.rejectionReason,
          ),
      },
      include: {
        customer: true,
        attendance: true,
        message: true,
        responsible: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });
  },

  async findById(
    companyId: string,
    receiptId: string,
  ) {
    return prisma.m1MPaymentReceipt.findFirst({
      where: {
        id: receiptId,
        companyId,
      },
      include: {
        customer: true,
        attendance: true,
        message: true,
        responsible: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        events: {
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  },

  async findByMessageId(
    companyId: string,
    messageId: string,
  ) {
    return prisma.m1MPaymentReceipt.findFirst({
      where: {
        companyId,
        messageId,
      },
      include: {
        customer: true,
        attendance: true,
        message: true,
        responsible: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });
  },

  async listByCompany(
    companyId: string,
    status?: M1MPaymentReceiptStatus,
    customerId?: string,
  ) {
    return prisma.m1MPaymentReceipt.findMany({
      where: {
        companyId,
        ...(status
          ? {
              status,
            }
          : {}),
        ...(customerId
          ? {
              customerId,
            }
          : {}),
      },
      include: {
        customer: true,
        attendance: true,
        message: true,
        responsible: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async update(
    companyId: string,
    receiptId: string,
    data: UpdatePaymentReceiptData,
  ) {
    const receipt =
      await this.findById(
        companyId,
        receiptId,
      );

    if (!receipt) {
      return null;
    }

    return prisma.m1MPaymentReceipt.update({
      where: {
        id: receiptId,
      },
      data:
        buildUpdateData(
          data,
        ),
      include: {
        customer: true,
        attendance: true,
        message: true,
        responsible: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });
  },

  async assignResponsible(
    companyId: string,
    receiptId: string,
    responsibleId: string,
  ) {
    return this.update(
      companyId,
      receiptId,
      {
        responsibleId,
      },
    );
  },

  async createEvent(
    data: CreatePaymentReceiptEventData,
  ) {
    return prisma.m1MPaymentReceiptEvent.create({
      data: {
        receiptId:
          data.receiptId,
        type:
          data.type,
        actorType:
          data.actorType,
        actorId:
          data.actorId ?? null,
        metadata:
          data.metadata ?? undefined,
        createdAt:
          data.createdAt ?? new Date(),
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });
  },

  async listEvents(
    receiptId: string,
  ) {
    return prisma.m1MPaymentReceiptEvent.findMany({
      where: {
        receiptId,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  },
};
