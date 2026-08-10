import { prisma } from "@/lib/prisma";

export const timelineRepository = {
  async findCustomer(
    companyId: string,
    customerId: string,
  ) {
    return prisma.m1MCustomer.findFirst({
      where: {
        id: customerId,
        companyId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });
  },

  async listMessages(
    companyId: string,
    customerId: string,
    limit: number,
  ) {
    return prisma.m1MMessage.findMany({
      where: {
        companyId,
        customerId,
        type: {
          not: "REACTION",
        },
      },
      select: {
        id: true,
        direction: true,
        type: true,
        fromMe: true,
        content: true,
        mediaUrl: true,
        mimeType: true,
        sentAt: true,
      },
      orderBy: {
        sentAt: "desc",
      },
      take: limit,
    });
  },

  async listAttendanceEvents(
    companyId: string,
    customerId: string,
    limit: number,
  ) {
    return prisma.m1MAttendanceEvent.findMany({
      where: {
        attendance: {
          companyId,
          customerId,
        },
      },
      select: {
        id: true,
        type: true,
        actorType: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        attendance: {
          select: {
            id: true,
            number: true,
            sector: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  },

  async listReceiptEvents(
    companyId: string,
    customerId: string,
    limit: number,
  ) {
    return prisma.m1MPaymentReceiptEvent.findMany({
      where: {
        receipt: {
          companyId,
          customerId,
        },
      },
      select: {
        id: true,
        type: true,
        actorType: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        receipt: {
          select: {
            id: true,
            status: true,
            amount: true,
            paymentMethod: true,
            identifiedBank: true,
            mediaUrl: true,
            fileName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  },

  async listReminders(
    companyId: string,
    customerId: string,
    limit: number,
  ) {
    return prisma.m1MReminder.findMany({
      where: {
        companyId,
        customerId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        remindAt: true,
        responsible: true,
        status: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  },
};
