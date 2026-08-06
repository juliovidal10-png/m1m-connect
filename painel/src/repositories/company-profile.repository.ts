import { prisma } from "@/lib/prisma";

export type CompanyKnowledgeProfileData = {
  companyId: string;
  presentation?: string | null;
  differentials?: string | null;
  productsServices?: string | null;
  targetAudience?: string | null;
  serviceArea?: string | null;
  companyPolicies?: string | null;
  importantInformation?: string | null;
  frequentlyAskedQuestions?: string | null;
};

export type CompanyKnowledgeProfileUpdateData =
  Omit<
    CompanyKnowledgeProfileData,
    "companyId"
  >;

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue || null;
}

function buildUpdateData(
  data: CompanyKnowledgeProfileUpdateData,
) {
  const updateData: {
    presentation?: string | null;
    differentials?: string | null;
    productsServices?: string | null;
    targetAudience?: string | null;
    serviceArea?: string | null;
    companyPolicies?: string | null;
    importantInformation?: string | null;
    frequentlyAskedQuestions?: string | null;
  } = {};

  if (
    data.presentation !==
    undefined
  ) {
    updateData.presentation =
      normalizeOptionalText(
        data.presentation,
      );
  }

  if (
    data.differentials !==
    undefined
  ) {
    updateData.differentials =
      normalizeOptionalText(
        data.differentials,
      );
  }

  if (
    data.productsServices !==
    undefined
  ) {
    updateData.productsServices =
      normalizeOptionalText(
        data.productsServices,
      );
  }

  if (
    data.targetAudience !==
    undefined
  ) {
    updateData.targetAudience =
      normalizeOptionalText(
        data.targetAudience,
      );
  }

  if (
    data.serviceArea !==
    undefined
  ) {
    updateData.serviceArea =
      normalizeOptionalText(
        data.serviceArea,
      );
  }

  if (
    data.companyPolicies !==
    undefined
  ) {
    updateData.companyPolicies =
      normalizeOptionalText(
        data.companyPolicies,
      );
  }

  if (
    data.importantInformation !==
    undefined
  ) {
    updateData.importantInformation =
      normalizeOptionalText(
        data.importantInformation,
      );
  }

  if (
    data.frequentlyAskedQuestions !==
    undefined
  ) {
    updateData.frequentlyAskedQuestions =
      normalizeOptionalText(
        data.frequentlyAskedQuestions,
      );
  }

  return updateData;
}

export const companyProfileRepository = {
  async findByCompanyId(
    companyId: string,
  ) {
    return prisma.m1MCompanyProfile.findUnique({
      where: {
        companyId,
      },
    });
  },

  async create(
    data: CompanyKnowledgeProfileData,
  ) {
    return prisma.m1MCompanyProfile.create({
      data: {
        companyId:
          data.companyId,
        presentation:
          normalizeOptionalText(
            data.presentation,
          ),
        differentials:
          normalizeOptionalText(
            data.differentials,
          ),
        productsServices:
          normalizeOptionalText(
            data.productsServices,
          ),
        targetAudience:
          normalizeOptionalText(
            data.targetAudience,
          ),
        serviceArea:
          normalizeOptionalText(
            data.serviceArea,
          ),
        companyPolicies:
          normalizeOptionalText(
            data.companyPolicies,
          ),
        importantInformation:
          normalizeOptionalText(
            data.importantInformation,
          ),
        frequentlyAskedQuestions:
          normalizeOptionalText(
            data.frequentlyAskedQuestions,
          ),
      },
    });
  },

  async update(
    companyId: string,
    data: CompanyKnowledgeProfileUpdateData,
  ) {
    return prisma.m1MCompanyProfile.update({
      where: {
        companyId,
      },
      data:
        buildUpdateData(
          data,
        ),
    });
  },

  async upsert(
    data: CompanyKnowledgeProfileData,
  ) {
    const existingProfile =
      await this.findByCompanyId(
        data.companyId,
      );

    if (!existingProfile) {
      return this.create(
        data,
      );
    }

    return this.update(
      data.companyId,
      {
        presentation:
          data.presentation,
        differentials:
          data.differentials,
        productsServices:
          data.productsServices,
        targetAudience:
          data.targetAudience,
        serviceArea:
          data.serviceArea,
        companyPolicies:
          data.companyPolicies,
        importantInformation:
          data.importantInformation,
        frequentlyAskedQuestions:
          data.frequentlyAskedQuestions,
      },
    );
  },
};
