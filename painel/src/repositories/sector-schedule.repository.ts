import {
  M1MWeekday,
} from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

export type SectorScheduleInput = {
  dayOfWeek: M1MWeekday;
  enabled: boolean;
  allDay: boolean;
  openingTime: string | null;
  closingTime: string | null;
  secondOpeningTime: string | null;
  secondClosingTime: string | null;
};

const weekdays = [
  M1MWeekday.MONDAY,
  M1MWeekday.TUESDAY,
  M1MWeekday.WEDNESDAY,
  M1MWeekday.THURSDAY,
  M1MWeekday.FRIDAY,
  M1MWeekday.SATURDAY,
  M1MWeekday.SUNDAY,
];

export const sectorScheduleRepository = {
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
      },
    });
  },

  async ensureWeekdays(
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

  async findAllBySector(
    sectorId: string,
  ) {
    return prisma.m1MSectorSchedule.findMany({
      where: {
        sectorId,
      },
    });
  },

  async replaceAll(
    sectorId: string,
    schedules: SectorScheduleInput[],
  ) {
    return prisma.$transaction(async (transaction) => {
      for (const schedule of schedules) {
        await transaction.m1MSectorSchedule.upsert({
          where: {
            sectorId_dayOfWeek: {
              sectorId,
              dayOfWeek:
                schedule.dayOfWeek,
            },
          },
          update: {
            enabled: schedule.enabled,
            allDay: schedule.allDay,
            openingTime:
              schedule.openingTime,
            closingTime:
              schedule.closingTime,
            secondOpeningTime:
              schedule.secondOpeningTime,
            secondClosingTime:
              schedule.secondClosingTime,
          },
          create: {
            sectorId,
            dayOfWeek:
              schedule.dayOfWeek,
            enabled: schedule.enabled,
            allDay: schedule.allDay,
            openingTime:
              schedule.openingTime,
            closingTime:
              schedule.closingTime,
            secondOpeningTime:
              schedule.secondOpeningTime,
            secondClosingTime:
              schedule.secondClosingTime,
          },
        });
      }

      return transaction.m1MSectorSchedule.findMany({
        where: {
          sectorId,
        },
      });
    });
  },
};
