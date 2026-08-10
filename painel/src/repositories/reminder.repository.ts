import { prisma } from "@/lib/prisma";

export type CreateReminderData = {
  companyId: string;
  customerId: string;
  title: string;
  description?: string | null;
  remindAt: Date;
  responsible?: string | null;
};

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

export const reminderRepository = {
  async findPendingByCustomer(
    companyId: string,
    customerId: string,
  ) {
    return prisma.m1MReminder.findMany({
      where: {
        companyId,
        customerId,
        status: "PENDING",
      },
      orderBy: {
        remindAt: "asc",
      },
    });
  },

  async findPendingByCompany(
    companyId: string,
  ) {
    return prisma.m1MReminder.findMany({
      where: {
        companyId,
        status: "PENDING",
      },
      orderBy: {
        remindAt: "asc",
      },
      include: {
        customer: true,
      },
    });
  },

  async create(data: CreateReminderData) {
    return prisma.m1MReminder.create({
      data: {
        companyId: data.companyId,
        customerId: data.customerId,
        title: data.title.trim(),
        description: normalizeOptionalText(
          data.description,
        ),
        remindAt: data.remindAt,
        responsible: normalizeOptionalText(
          data.responsible,
        ),
        status: "PENDING",
      },
    });
  },

  async complete(
    id: string,
    companyId: string,
  ) {
    const reminder =
      await prisma.m1MReminder.findFirst({
        where: {
          id,
          companyId,
        },
      });

    if (!reminder) {
      return null;
    }

    return prisma.m1MReminder.update({
      where: {
        id: reminder.id,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  },

  async postpone(
    id: string,
    companyId: string,
    remindAt: Date,
  ) {
    const reminder =
      await prisma.m1MReminder.findFirst({
        where: {
          id,
          companyId,
        },
      });

    if (!reminder) {
      return null;
    }

    return prisma.m1MReminder.update({
      where: {
        id,
      },
      data: {
        remindAt,
        status: "PENDING",
        completedAt: null,
        notifiedAt: null,
      },
    });
  },

  async markAsNotified(
    id: string,
    companyId: string,
  ) {
    const reminder =
      await prisma.m1MReminder.findFirst({
        where: {
          id,
          companyId,
        },
      });

    if (!reminder) {
      return null;
    }

    return prisma.m1MReminder.update({
      where: {
        id,
      },
      data: {
        notifiedAt: new Date(),
      },
    });
  },
};
