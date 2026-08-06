import {
  outOfHoursRepository,
} from "@/repositories/out-of-hours.repository";

const defaultOutOfHoursMessage =
  "Olá! No momento estamos fora do nosso horário de atendimento. Sua mensagem foi recebida e será respondida assim que retornarmos.";

function requireText(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `${fieldName} é obrigatório.`,
    );
  }

  return normalizedValue;
}

function normalizeOptionalMessage(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      "A mensagem informada é inválida.",
    );
  }

  const normalizedValue =
    value.trim();

  return normalizedValue || null;
}

export const outOfHoursService = {
  async getSettings(
    companyId: string,
    sectorId: string,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const normalizedSectorId =
      requireText(
        sectorId,
        "Setor",
      );

    const [
      company,
      sector,
    ] = await Promise.all([
      outOfHoursRepository.findCompany(
        normalizedCompanyId,
      ),
      outOfHoursRepository.findSector(
        normalizedCompanyId,
        normalizedSectorId,
      ),
    ]);

    if (!company) {
      throw new Error(
        "Empresa não encontrada.",
      );
    }

    if (!sector) {
      throw new Error(
        "Setor não encontrado.",
      );
    }

    const companyMessage =
      company.outOfHoursMessage ??
      defaultOutOfHoursMessage;

    const effectiveMessage =
      sector.useCustomOutOfHoursMessage &&
      sector.outOfHoursMessage
        ? sector.outOfHoursMessage
        : companyMessage;

    return {
      company: {
        id: company.id,
        name: company.name,
        outOfHoursMessage:
          companyMessage,
      },
      sector: {
        id: sector.id,
        name: sector.name,
        useCustomOutOfHoursMessage:
          sector.useCustomOutOfHoursMessage,
        outOfHoursMessage:
          sector.outOfHoursMessage,
      },
      effectiveMessage,
    };
  },

  async getCompanyMessage(
    companyId: string,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const company =
      await outOfHoursRepository.findCompany(
        normalizedCompanyId,
      );

    if (!company) {
      throw new Error(
        "Empresa não encontrada.",
      );
    }

    return (
      company.outOfHoursMessage ??
      defaultOutOfHoursMessage
    );
  },
  async updateCompanyMessage(
    companyId: string,
    input: unknown,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const message =
      normalizeOptionalMessage(
        input,
      );

    return outOfHoursRepository.updateCompanyMessage(
      normalizedCompanyId,
      message,
    );
  },

  async updateSectorMessage(
    companyId: string,
    sectorId: string,
    input: {
      useCustomMessage?: unknown;
      message?: unknown;
    },
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const normalizedSectorId =
      requireText(
        sectorId,
        "Setor",
      );

    const useCustomMessage =
      input.useCustomMessage === true;

    const message =
      normalizeOptionalMessage(
        input.message,
      );

    if (
      useCustomMessage &&
      !message
    ) {
      throw new Error(
        "Informe a mensagem personalizada do setor.",
      );
    }

    return outOfHoursRepository.updateSectorMessage(
      normalizedCompanyId,
      normalizedSectorId,
      {
        useCustomOutOfHoursMessage:
          useCustomMessage,
        outOfHoursMessage:
          useCustomMessage
            ? message
            : null,
      },
    );
  },
};
