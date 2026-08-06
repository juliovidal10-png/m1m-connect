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

    return companyRepository.updateProfile(
      normalizedCompanyId,
      data,
    );
  },
};