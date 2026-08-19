import { prisma } from "@/lib/prisma";

export type CompanyProfileData = {
  name?: string;
  segment?: string | null;
  presentation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  humanReturnMode?:
    | "IMMEDIATE"
    | "NEXT_CONVERSATION"
    | "MANUAL";
  humanClosingMessage?: string | null;
  aiEnabled?: boolean;
};

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

export const companyRepository = {
  async findById(companyId: string) {
    return prisma.m1MCompany.findUnique({
      where: {
        id: companyId,
      },
    });
  },

  async findByWhatsappInstanceName(
    whatsappInstanceName: string,
  ) {
    return prisma.m1MCompany.findUnique({
      where: {
        whatsappInstanceName,
      },
    });
  },
  async updateWhatsappInstanceName(
    companyId: string,
    whatsappInstanceName: string,
  ) {
    return prisma.m1MCompany.update({
      where: {
        id: companyId,
      },
      data: {
        whatsappInstanceName,
      },
    });
  },

  async completeOnboarding(companyId: string) {
    return prisma.m1MCompany.update({
      where: {
        id: companyId,
      },
      data: {
        onboardingCompleted: true,
      },
    });
  },

  async updateProfile(
    companyId: string,
    data: CompanyProfileData,
  ) {
    const updateData: CompanyProfileData = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.segment !== undefined) {
      updateData.segment =
        normalizeOptionalText(data.segment);
    }

    if (data.presentation !== undefined) {
      updateData.presentation =
        normalizeOptionalText(
          data.presentation,
        );
    }

    if (data.address !== undefined) {
      updateData.address =
        normalizeOptionalText(data.address);
    }

    if (data.city !== undefined) {
      updateData.city =
        normalizeOptionalText(data.city);
    }

    if (data.state !== undefined) {
      updateData.state =
        normalizeOptionalText(data.state);
    }

    if (data.zipCode !== undefined) {
      updateData.zipCode =
        normalizeOptionalText(data.zipCode);
    }

    if (data.phone !== undefined) {
      updateData.phone =
        normalizeOptionalText(data.phone);
    }

    if (data.whatsapp !== undefined) {
      updateData.whatsapp =
        normalizeOptionalText(data.whatsapp);
    }

    if (data.email !== undefined) {
      updateData.email =
        normalizeOptionalText(data.email);
    }

    if (data.website !== undefined) {
      updateData.website =
        normalizeOptionalText(data.website);
    }

    if (data.instagram !== undefined) {
      updateData.instagram =
        normalizeOptionalText(data.instagram);
    }

    if (
      data.humanReturnMode !==
      undefined
    ) {
      updateData.humanReturnMode =
        data.humanReturnMode;
    }

    if (
      data.humanClosingMessage !==
      undefined
    ) {
      updateData.humanClosingMessage =
        normalizeOptionalText(
          data.humanClosingMessage,
        );
    }

    if (data.aiEnabled !== undefined) {
      updateData.aiEnabled = data.aiEnabled;
    }

    return prisma.m1MCompany.update({
      where: {
        id: companyId,
      },
      data: updateData,
    });
  },
};
