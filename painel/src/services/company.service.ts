import {
  companyRepository,
  type CompanyProfileData,
} from "@/repositories/company.repository";

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

const humanReturnModes = [
  "IMMEDIATE",
  "NEXT_CONVERSATION",
  "MANUAL",
] as const;

function normalizeHumanReturnMode(
  value:
    | CompanyProfileData["humanReturnMode"]
    | undefined,
) {
  if (value === undefined) {
    return undefined;
  }

  if (
    !humanReturnModes.includes(
      value,
    )
  ) {
    throw new Error(
      "Política de retorno da IA inválida.",
    );
  }

  return value;
}

function normalizeAiEnabled(
  value:
    | CompanyProfileData["aiEnabled"]
    | undefined,
) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(
      "Status da IA inválido.",
    );
  }

  return value;
}

export const companyService = {
  async getCompanyProfile(companyId: string) {
    const normalizedCompanyId = requireText(
      companyId,
      "Empresa",
    );

    const company =
      await companyRepository.findById(
        normalizedCompanyId,
      );

    if (!company) {
      throw new Error(
        "Empresa não encontrada.",
      );
    }

    return company;
  },

  async completeOnboarding(companyId: string) {
    const normalizedCompanyId = requireText(
      companyId,
      "Empresa",
    );

    const company =
      await companyRepository.findById(
        normalizedCompanyId,
      );

    if (!company) {
      throw new Error(
        "Empresa não encontrada.",
      );
    }

    if (company.onboardingCompleted) {
      return company;
    }

    return companyRepository.completeOnboarding(
      normalizedCompanyId,
    );
  },

  async updateCompanyProfile(
    companyId: string,
    data: CompanyProfileData,
  ) {
    const normalizedCompanyId = requireText(
      companyId,
      "Empresa",
    );

    if (data.name !== undefined) {
      data.name = requireText(
        data.name,
        "Nome da empresa",
      );
    }

    if (
      data.humanReturnMode !==
      undefined
    ) {
      data.humanReturnMode =
        normalizeHumanReturnMode(
          data.humanReturnMode,
        );
    }

    if (data.aiEnabled !== undefined) {
      data.aiEnabled =
        normalizeAiEnabled(
          data.aiEnabled,
        );
    }

    return companyRepository.updateProfile(
      normalizedCompanyId,
      data,
    );
  },
};
