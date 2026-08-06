import {
  M1MWeekday,
} from "@/generated/prisma/enums";

import {
  companyScheduleRepository,
  type CompanyScheduleInput,
} from "@/repositories/company-schedule.repository";

const weekdayOrder: M1MWeekday[] = [
  M1MWeekday.MONDAY,
  M1MWeekday.TUESDAY,
  M1MWeekday.WEDNESDAY,
  M1MWeekday.THURSDAY,
  M1MWeekday.FRIDAY,
  M1MWeekday.SATURDAY,
  M1MWeekday.SUNDAY,
];

const allowedWeekdays =
  new Set<M1MWeekday>(
    weekdayOrder,
  );

function requireText(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalizedValue =
    value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `${fieldName} é obrigatório.`,
    );
  }

  return normalizedValue;
}

function normalizeTime(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      value,
    )
  ) {
    throw new Error(
      "Informe os horários no formato HH:mm.",
    );
  }

  return value;
}

function timeToMinutes(
  value: string,
) {
  const [hours, minutes] =
    value.split(":").map(Number);

  return hours * 60 + minutes;
}

function normalizeSchedule(
  value: unknown,
): CompanyScheduleInput {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      "Horário inválido.",
    );
  }

  const input = value as {
    dayOfWeek?: unknown;
    enabled?: unknown;
    allDay?: unknown;
    openingTime?: unknown;
    closingTime?: unknown;
    secondOpeningTime?: unknown;
    secondClosingTime?: unknown;
  };

  if (
    typeof input.dayOfWeek !== "string" ||
    !allowedWeekdays.has(
      input.dayOfWeek as M1MWeekday,
    )
  ) {
    throw new Error(
      "Dia da semana inválido.",
    );
  }

  const enabled =
    input.enabled === true;

  const allDay =
    enabled &&
    input.allDay === true;

  if (!enabled || allDay) {
    return {
      dayOfWeek:
        input.dayOfWeek as M1MWeekday,
      enabled,
      allDay,
      openingTime: null,
      closingTime: null,
      secondOpeningTime: null,
      secondClosingTime: null,
    };
  }

  const openingTime =
    normalizeTime(
      input.openingTime,
    );

  const closingTime =
    normalizeTime(
      input.closingTime,
    );

  if (
    !openingTime ||
    !closingTime
  ) {
    throw new Error(
      "Informe o horário de abertura e fechamento.",
    );
  }

  if (
    timeToMinutes(openingTime) >=
    timeToMinutes(closingTime)
  ) {
    throw new Error(
      "A abertura deve ser anterior ao fechamento.",
    );
  }

  const secondOpeningTime =
    normalizeTime(
      input.secondOpeningTime,
    );

  const secondClosingTime =
    normalizeTime(
      input.secondClosingTime,
    );

  if (
    Boolean(
      secondOpeningTime ||
      secondClosingTime,
    ) &&
    (
      !secondOpeningTime ||
      !secondClosingTime
    )
  ) {
    throw new Error(
      "Preencha os dois horários do período após o almoço.",
    );
  }

  if (
    secondOpeningTime &&
    secondClosingTime
  ) {
    if (
      timeToMinutes(
        secondOpeningTime,
      ) >=
      timeToMinutes(
        secondClosingTime,
      )
    ) {
      throw new Error(
        "O retorno do almoço deve ser anterior ao fechamento.",
      );
    }

    if (
      timeToMinutes(
        secondOpeningTime,
      ) <
      timeToMinutes(
        closingTime,
      )
    ) {
      throw new Error(
        "O retorno do almoço não pode ocorrer antes da saída.",
      );
    }
  }

  return {
    dayOfWeek:
      input.dayOfWeek as M1MWeekday,
    enabled,
    allDay,
    openingTime,
    closingTime,
    secondOpeningTime,
    secondClosingTime,
  };
}

function orderSchedules<
  T extends {
    dayOfWeek: M1MWeekday;
  },
>(
  schedules: T[],
) {
  const scheduleMap =
    new Map(
      schedules.map((schedule) => [
        schedule.dayOfWeek,
        schedule,
      ]),
    );

  return weekdayOrder.map(
    (dayOfWeek) =>
      scheduleMap.get(dayOfWeek),
  );
}

export const companyScheduleService = {
  async getSchedules(
    companyId: string,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const company =
      await companyScheduleRepository.findCompany(
        normalizedCompanyId,
      );

    if (!company) {
      throw new Error(
        "Empresa não encontrada.",
      );
    }

    await companyScheduleRepository.ensureWeekdays(
      normalizedCompanyId,
    );

    const schedules =
      await companyScheduleRepository.findAll(
        normalizedCompanyId,
      );

    return {
      company,
      schedules:
        orderSchedules(
          schedules,
        ),
    };
  },

  async updateSchedules(
    companyId: string,
    input: unknown,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const company =
      await companyScheduleRepository.findCompany(
        normalizedCompanyId,
      );

    if (!company) {
      throw new Error(
        "Empresa não encontrada.",
      );
    }

    if (!Array.isArray(input)) {
      throw new Error(
        "A lista de horários é inválida.",
      );
    }

    const schedules =
      input.map(
        normalizeSchedule,
      );

    const uniqueDays =
      new Set(
        schedules.map(
          (schedule) =>
            schedule.dayOfWeek,
        ),
      );

    if (
      schedules.length !== 7 ||
      uniqueDays.size !== 7
    ) {
      throw new Error(
        "Envie exatamente os sete dias da semana, sem duplicações.",
      );
    }

    const savedSchedules =
      await companyScheduleRepository.replaceAll(
        normalizedCompanyId,
        schedules,
      );

    return {
      company,
      schedules:
        orderSchedules(
          savedSchedules,
        ),
    };
  },
};
