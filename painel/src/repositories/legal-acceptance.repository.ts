import { prisma } from "@/lib/prisma";

export const legalAcceptanceRepository = {
  async findAcceptance(
    companyId: string,
    userId: string,
    document: string,
    version: string,
  ) {
    return prisma.m1MLegalAcceptance.findUnique({
      where: {
        companyId_userId_document_version: {
          companyId,
          userId,
          document,
          version,
        },
      },
    });
  },

  async saveAcceptance(
    companyId: string,
    userId: string,
    document: string,
    version: string,
  ) {
    return prisma.m1MLegalAcceptance.upsert({
      where: {
        companyId_userId_document_version: {
          companyId,
          userId,
          document,
          version,
        },
      },
      update: {},
      create: {
        companyId,
        userId,
        document,
        version,
      },
    });
  },
};
