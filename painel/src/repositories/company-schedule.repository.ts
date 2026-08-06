import {
  M1MWeekday,
} from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

export type CompanyScheduleInput = {
  dayOfWeek: M1MWeekday;
  enabled: boolean;
  allDay: boolean;
  openingTime: string | null;
  closingTime: string | null;
  secondOpeningTime: string | null;
  secondClosingTime: string | null;
};

const weekdays: M1MWeekday[] = [
  M1MWeekday.MONDAY,
  M1MWeekday.TUESDAY,
  M1MWeekday.WEDNESDAY,
  M1MWeekday.THURSDAY,
  M1MWeekday.FRIDAY,
  M1MWeekday.SATURDAY,
  M1MWeekday.SUNDAY,
];

export const companyScheduleRepository = {
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
      },
    });
  },

  async ensureWeekdays(
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

  async findAll(
    companyId: string,
  ) {
    return prisma.m1MCompanySchedule.findMany({
      where: {
        companyId,
      },
    });
  },

  async replaceAll(
    companyId: string,
    schedules: CompanyScheduleInput[],
  ) {
    return prisma.$transaction(
      async (transaction) => {
        for (const schedule of schedules) {
          await transaction.m1MCompanySchedule.upsert({
            where: {
              companyId_dayOfWeek: {
                companyId,
                dayOfWeek:
                  schedule.dayOfWeek,
              },
            },
            update: {
              enabled:
                schedule.enabled,
              allDay:
                schedule.allDay,
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
              companyId,
              dayOfWeek:
                schedule.dayOfWeek,
              enabled:
                schedule.enabled,
              allDay:
                schedule.allDay,
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

        return transaction.m1MCompanySchedule.findMany({
          where: {
            companyId,
          },
        });
      },
    );
  },
};
