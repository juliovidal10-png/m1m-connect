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

    return companyRepository.updateProfile(
      normalizedCompanyId,
      data,
    );
  },
};
