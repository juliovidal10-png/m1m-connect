import {
  companyRepository,
} from "@/repositories/company.repository";
import {
  companyProfileRepository,
  type CompanyKnowledgeProfileData,
  type CompanyKnowledgeProfileUpdateData,
} from "@/repositories/company-profile.repository";

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

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue || null;
}

function normalizeProfileData(
  input: CompanyKnowledgeProfileUpdateData,
): CompanyKnowledgeProfileUpdateData {
  return {
    presentation:
      input.presentation !==
      undefined
        ? normalizeOptionalText(
            input.presentation,
          )
        : undefined,
    differentials:
      input.differentials !==
      undefined
        ? normalizeOptionalText(
            input.differentials,
          )
        : undefined,
    productsServices:
      input.productsServices !==
      undefined
        ? normalizeOptionalText(
            input.productsServices,
          )
        : undefined,
    targetAudience:
      input.targetAudience !==
      undefined
        ? normalizeOptionalText(
            input.targetAudience,
          )
        : undefined,
    serviceArea:
      input.serviceArea !==
      undefined
        ? normalizeOptionalText(
            input.serviceArea,
          )
        : undefined,
    companyPolicies:
      input.companyPolicies !==
      undefined
        ? normalizeOptionalText(
            input.companyPolicies,
          )
        : undefined,
    importantInformation:
      input.importantInformation !==
      undefined
        ? normalizeOptionalText(
            input.importantInformation,
          )
        : undefined,
    frequentlyAskedQuestions:
      input.frequentlyAskedQuestions !==
      undefined
        ? normalizeOptionalText(
            input.frequentlyAskedQuestions,
          )
        : undefined,
  };
}

export const companyProfileService = {
  async getCompanyProfile(
    companyId: string,
  ) {
    const normalizedCompanyId =
      requireText(
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

    return companyProfileRepository.findByCompanyId(
      normalizedCompanyId,
    );
  },

  async saveCompanyProfile(
    companyId: string,
    input: CompanyKnowledgeProfileUpdateData,
  ) {
    const normalizedCompanyId =
      requireText(
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

    const normalizedData =
      normalizeProfileData(
        input,
      );

    const data:
      CompanyKnowledgeProfileData = {
        companyId:
          normalizedCompanyId,
        ...normalizedData,
      };

    return companyProfileRepository.upsert(
      data,
    );
  },
};
