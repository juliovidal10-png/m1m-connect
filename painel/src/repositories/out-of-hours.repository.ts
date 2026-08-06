import { prisma } from "@/lib/prisma";

export type OutOfHoursSettingsData = {
  companyMessage: string | null;
  useCustomMessage: boolean;
  sectorMessage: string | null;
};

export const outOfHoursRepository = {
  async findCompany(
    companyId: string,
  ) {
    return prisma.m1MCompany.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
        name: true,
        outOfHoursMessage: true,
      },
    });
  },

  async findSector(
    companyId: string,
    sectorId: string,
  ) {
    return prisma.m1MSector.findFirst({
      where: {
        id: sectorId,
        companyId,
      },
      select: {
        id: true,
        name: true,
        useCustomOutOfHoursMessage: true,
        outOfHoursMessage: true,
      },
    });
  },

  async updateCompanyMessage(
    companyId: string,
    message: string | null,
  ) {
    return prisma.m1MCompany.update({
      where: {
        id: companyId,
      },
      data: {
        outOfHoursMessage: message,
      },
      select: {
        id: true,
        name: true,
        outOfHoursMessage: true,
      },
    });
  },

  async updateSectorMessage(
    companyId: string,
    sectorId: string,
    data: {
      useCustomOutOfHoursMessage: boolean;
      outOfHoursMessage: string | null;
    },
  ) {
    const sector =
      await this.findSector(
        companyId,
        sectorId,
      );

    if (!sector) {
      throw new Error(
        "Setor não encontrado.",
      );
    }

    return prisma.m1MSector.update({
      where: {
        id: sectorId,
      },
      data: {
        useCustomOutOfHoursMessage:
          data.useCustomOutOfHoursMessage,
        outOfHoursMessage:
          data.outOfHoursMessage,
      },
      select: {
        id: true,
        name: true,
        useCustomOutOfHoursMessage: true,
        outOfHoursMessage: true,
      },
    });
  },
};
