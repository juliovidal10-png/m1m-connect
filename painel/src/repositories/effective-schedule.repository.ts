import {
  M1MWeekday,
} from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

const weekdays: M1MWeekday[] = [
  M1MWeekday.MONDAY,
  M1MWeekday.TUESDAY,
  M1MWeekday.WEDNESDAY,
  M1MWeekday.THURSDAY,
  M1MWeekday.FRIDAY,
  M1MWeekday.SATURDAY,
  M1MWeekday.SUNDAY,
];

export const effectiveScheduleRepository = {
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
        companyId: true,
        useCustomSchedule: true,
      },
    });
  },

  async ensureCompanyWeekdays(
    companyId: string,
  ) {
    await prisma.m1MCompanySchedule.createMany({
      data: weekdays.map((dayOfWeek) => ({
        companyId,
        dayOfWeek,
      })),
      skipDuplicates: true,
    });
  },

  async ensureSectorWeekdays(
    sectorId: string,
  ) {
    await prisma.m1MSectorSchedule.createMany({
      data: weekdays.map((dayOfWeek) => ({
        sectorId,
        dayOfWeek,
      })),
      skipDuplicates: true,
    });
  },

  async findCompanySchedules(
    companyId: string,
  ) {
    return prisma.m1MCompanySchedule.findMany({
      where: {
        companyId,
      },
    });
  },

  async findSectorSchedules(
    sectorId: string,
  ) {
    return prisma.m1MSectorSchedule.findMany({
      where: {
        sectorId,
      },
    });
  },

  async getEffectiveSchedules(
    companyId: string,
    sectorId: string,
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

    if (sector.useCustomSchedule) {
      await this.ensureSectorWeekdays(
        sectorId,
      );

      const schedules =
        await this.findSectorSchedules(
          sectorId,
        );

      return {
        sector,
        source: "SECTOR" as const,
        schedules,
      };
    }

    await this.ensureCompanyWeekdays(
      companyId,
    );

    const schedules =
      await this.findCompanySchedules(
        companyId,
      );

    return {
      sector,
      source: "COMPANY" as const,
      schedules,
    };
  },
};
