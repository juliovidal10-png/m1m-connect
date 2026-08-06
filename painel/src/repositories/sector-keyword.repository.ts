import { prisma } from "@/lib/prisma";

export type CreateSectorKeywordData = {
  sectorId: string;
  keyword: string;
};

export const sectorKeywordRepository = {
  async listBySector(
    companyId: string,
    sectorId: string,
  ) {
    return prisma.m1MSectorKeyword.findMany({
      where: {
        sectorId,
        sector: {
          companyId,
        },
      },
      orderBy: [
        {
          keyword: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });
  },

  async listByCompany(
    companyId: string,
  ) {
    return prisma.m1MSectorKeyword.findMany({
      where: {
        sector: {
          companyId,
          active: true,
        },
      },
      select: {
        id: true,
        sectorId: true,
        keyword: true,
        createdAt: true,
        updatedAt: true,
        sector: {
          select: {
            id: true,
            name: true,
            active: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [
        {
          sector: {
            sortOrder: "asc",
          },
        },
        {
          keyword: "asc",
        },
      ],
    });
  },

  async findById(
    companyId: string,
    keywordId: string,
  ) {
    return prisma.m1MSectorKeyword.findFirst({
      where: {
        id: keywordId,
        sector: {
          companyId,
        },
      },
    });
  },

  async findByKeyword(
    companyId: string,
    sectorId: string,
    keyword: string,
  ) {
    return prisma.m1MSectorKeyword.findFirst({
      where: {
        sectorId,
        keyword,
        sector: {
          companyId,
        },
      },
    });
  },

  async create(
    companyId: string,
    data: CreateSectorKeywordData,
  ) {
    return prisma.m1MSectorKeyword.create({
      data: {
        sectorId: data.sectorId,
        keyword: data.keyword,
      },
      include: {
        sector: {
          select: {
            id: true,
            companyId: true,
            name: true,
          },
        },
      },
    });
  },

  async delete(
    companyId: string,
    keywordId: string,
  ) {
    const keyword =
      await this.findById(
        companyId,
        keywordId,
      );

    if (!keyword) {
      throw new Error(
        "Palavra-chave não encontrada.",
      );
    }

    return prisma.m1MSectorKeyword.delete({
      where: {
        id: keyword.id,
      },
    });
  },

  async deleteAllBySector(
    companyId: string,
    sectorId: string,
  ) {
    return prisma.m1MSectorKeyword.deleteMany({
      where: {
        sectorId,
        sector: {
          companyId,
        },
      },
    });
  },
};
