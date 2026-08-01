import {
  M1MWeekday,
} from "@/generated/prisma/enums";

import {
  sectorScheduleRepository,
} from "@/repositories/sector-schedule.repository";

type ScheduleLike = {
  dayOfWeek: M1MWeekday;
  enabled: boolean;
  allDay: boolean;
  openingTime: string | null;
  closingTime: string | null;
  secondOpeningTime: string | null;
  secondClosingTime: string | null;
};

export type SectorAvailabilityResult = {
  isOpen: boolean;
  reason:
    | "OPEN"
    | "OPEN_ALL_DAY"
    | "CLOSED_DAY"
    | "BEFORE_OPENING"
    | "LUNCH_BREAK"
    | "AFTER_CLOSING"
    | "NO_SCHEDULE";
  dayOfWeek: M1MWeekday;
  currentTime: string;
  nextOpening: {
    dayOfWeek: M1MWeekday;
    time: string;
  } | null;
};

const weekdayOrder: M1MWeekday[] = [
  M1MWeekday.SUNDAY,
  M1MWeekday.MONDAY,
  M1MWeekday.TUESDAY,
  M1MWeekday.WEDNESDAY,
  M1MWeekday.THURSDAY,
  M1MWeekday.FRIDAY,
  M1MWeekday.SATURDAY,
];

function timeToMinutes(
  value: string,
) {
  const [hours, minutes] =
    value.split(":").map(Number);

  return hours * 60 + minutes;
}

function getCurrentParts(
  date: Date,
  timeZone: string,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    ).formatToParts(date);

  const weekday =
    parts.find(
      (part) =>
        part.type === "weekday",
    )?.value;

  const hour =
    parts.find(
      (part) =>
        part.type === "hour",
    )?.value;

  const minute =
    parts.find(
      (part) =>
        part.type === "minute",
    )?.value;

  const weekdayMap: Record<
    string,
    M1MWeekday
  > = {
    Sun: M1MWeekday.SUNDAY,
    Mon: M1MWeekday.MONDAY,
    Tue: M1MWeekday.TUESDAY,
    Wed: M1MWeekday.WEDNESDAY,
    Thu: M1MWeekday.THURSDAY,
    Fri: M1MWeekday.FRIDAY,
    Sat: M1MWeekday.SATURDAY,
  };

  if (
    !weekday ||
    !hour ||
    !minute ||
    !weekdayMap[weekday]
  ) {
    throw new Error(
      "Não foi possível identificar o horário atual.",
    );
  }

  return {
    dayOfWeek:
      weekdayMap[weekday],
    currentTime:
      `${hour}:${minute}`,
  };
}

function isInsidePeriod(
  currentMinutes: number,
  openingTime: string | null,
  closingTime: string | null,
) {
  if (
    !openingTime ||
    !closingTime
  ) {
    return false;
  }

  return (
    currentMinutes >=
      timeToMinutes(openingTime) &&
    currentMinutes <
      timeToMinutes(closingTime)
  );
}

function findNextOpening(
  currentDay: M1MWeekday,
  currentTime: string,
  schedules: ScheduleLike[],
) {
  const scheduleMap =
    new Map(
      schedules.map(
        (schedule) => [
          schedule.dayOfWeek,
          schedule,
        ],
      ),
    );

  const currentIndex =
    weekdayOrder.indexOf(
      currentDay,
    );

  for (
    let offset = 0;
    offset < 7;
    offset += 1
  ) {
    const index =
      (
        currentIndex +
        offset
      ) %
      weekdayOrder.length;

    const dayOfWeek =
      weekdayOrder[index];

    const schedule =
      scheduleMap.get(
        dayOfWeek,
      );

    if (
      !schedule ||
      !schedule.enabled
    ) {
      continue;
    }

    if (schedule.allDay) {
      return {
        dayOfWeek,
        time: "00:00",
      };
    }

    if (!schedule.openingTime) {
      continue;
    }

    if (offset === 0) {
      const currentMinutes =
        timeToMinutes(
          currentTime,
        );

      if (
        currentMinutes <
        timeToMinutes(
          schedule.openingTime,
        )
      ) {
        return {
          dayOfWeek,
          time:
            schedule.openingTime,
        };
      }

      if (
        schedule.secondOpeningTime &&
        schedule.closingTime &&
        currentMinutes >=
          timeToMinutes(
            schedule.closingTime,
          ) &&
        currentMinutes <
          timeToMinutes(
            schedule.secondOpeningTime,
          )
      ) {
        return {
          dayOfWeek,
          time:
            schedule.secondOpeningTime,
        };
      }

      continue;
    }

    return {
      dayOfWeek,
      time:
        schedule.openingTime,
    };
  }

  return null;
}

export const sectorAvailabilityService = {
  evaluateSchedule(
    schedule: ScheduleLike | undefined,
    schedules: ScheduleLike[],
    dayOfWeek: M1MWeekday,
    currentTime: string,
  ): SectorAvailabilityResult {
    const nextOpening =
      findNextOpening(
        dayOfWeek,
        currentTime,
        schedules,
      );

    if (!schedule) {
      return {
        isOpen: false,
        reason: "NO_SCHEDULE",
        dayOfWeek,
        currentTime,
        nextOpening,
      };
    }

    if (!schedule.enabled) {
      return {
        isOpen: false,
        reason: "CLOSED_DAY",
        dayOfWeek,
        currentTime,
        nextOpening,
      };
    }

    if (schedule.allDay) {
      return {
        isOpen: true,
        reason: "OPEN_ALL_DAY",
        dayOfWeek,
        currentTime,
        nextOpening: null,
      };
    }

    const currentMinutes =
      timeToMinutes(
        currentTime,
      );

    if (
      schedule.openingTime &&
      currentMinutes <
        timeToMinutes(
          schedule.openingTime,
        )
    ) {
      return {
        isOpen: false,
        reason: "BEFORE_OPENING",
        dayOfWeek,
        currentTime,
        nextOpening,
      };
    }

    const inFirstPeriod =
      isInsidePeriod(
        currentMinutes,
        schedule.openingTime,
        schedule.closingTime,
      );

    const inSecondPeriod =
      isInsidePeriod(
        currentMinutes,
        schedule.secondOpeningTime,
        schedule.secondClosingTime,
      );

    if (
      inFirstPeriod ||
      inSecondPeriod
    ) {
      return {
        isOpen: true,
        reason: "OPEN",
        dayOfWeek,
        currentTime,
        nextOpening: null,
      };
    }

    if (
      schedule.closingTime &&
      schedule.secondOpeningTime &&
      currentMinutes >=
        timeToMinutes(
          schedule.closingTime,
        ) &&
      currentMinutes <
        timeToMinutes(
          schedule.secondOpeningTime,
        )
    ) {
      return {
        isOpen: false,
        reason: "LUNCH_BREAK",
        dayOfWeek,
        currentTime,
        nextOpening,
      };
    }

    return {
      isOpen: false,
      reason: "AFTER_CLOSING",
      dayOfWeek,
      currentTime,
      nextOpening,
    };
  },

  async isSectorOpenNow(
    companyId: string,
    sectorId: string,
    options?: {
      date?: Date;
      timeZone?: string;
    },
  ) {
    const sector =
      await sectorScheduleRepository.findSector(
        companyId,
        sectorId,
      );

    if (!sector) {
      throw new Error(
        "Setor não encontrado.",
      );
    }

    await sectorScheduleRepository.ensureWeekdays(
      sectorId,
    );

    const schedules =
      await sectorScheduleRepository.findAllBySector(
        sectorId,
      );

    const {
      dayOfWeek,
      currentTime,
    } = getCurrentParts(
      options?.date ??
        new Date(),
      options?.timeZone ??
        "America/Cuiaba",
    );

    const schedule =
      schedules.find(
        (item) =>
          item.dayOfWeek ===
          dayOfWeek,
      );

    return {
      sector,
      ...this.evaluateSchedule(
        schedule,
        schedules,
        dayOfWeek,
        currentTime,
      ),
    };
  },
};
