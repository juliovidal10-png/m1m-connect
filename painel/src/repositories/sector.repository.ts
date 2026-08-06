import { prisma } from "@/lib/prisma";

export type SectorData = {
  companyId: string;
  name: string;
  description?: string | null;
  knowledge?: string | null;
  active?: boolean;
  sortOrder?: number;
};

export type SectorUpdateData = {
  name?: string;
  description?: string | null;
  knowledge?: string | null;
  active?: boolean;
  sortOrder?: number;
};

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

export const sectorRepository = {
  async findAllByCompany(
    companyId: string,
  ) {
    return prisma.m1MSector.findMany({
      where: {
        companyId,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    });
  },

  async findActiveByCompany(
    companyId: string,
  ) {
    return prisma.m1MSector.findMany({
      where: {
        companyId,
        active: true,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        description: true,
        sortOrder: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    });
  },

  async findById(
    companyId: string,
    sectorId: string,
  ) {
    return prisma.m1MSector.findFirst({
      where: {
        id: sectorId,
        companyId,
      },
    });
  },

  async create(
    data: SectorData,
  ) {
    return prisma.m1MSector.create({
      data: {
        companyId:
          data.companyId,
        name:
          data.name.trim(),
        description:
          normalizeOptionalText(
            data.description,
          ),
        knowledge:
          normalizeOptionalText(
            data.knowledge,
          ),
        active:
          data.active ?? true,
        sortOrder:
          data.sortOrder ?? 0,
      },
    });
  },

  async update(
    companyId: string,
    sectorId: string,
    data: SectorUpdateData,
  ) {
    const updateData:
      SectorUpdateData = {};

    if (data.name !== undefined) {
      updateData.name =
        data.name.trim();
    }

    if (
      data.description !==
      undefined
    ) {
      updateData.description =
        normalizeOptionalText(
          data.description,
        );
    }

    if (
      data.knowledge !==
      undefined
    ) {
      updateData.knowledge =
        normalizeOptionalText(
          data.knowledge,
        );
    }

    if (
      data.active !== undefined
    ) {
      updateData.active =
        data.active;
    }

    if (
      data.sortOrder !==
      undefined
    ) {
      updateData.sortOrder =
        data.sortOrder;
    }

    return prisma.m1MSector.update({
      where: {
        id: sectorId,
      },
      data: updateData,
    });
  },

  async delete(
    companyId: string,
    sectorId: string,
  ) {
    const sector =
      await this.findById(
        companyId,
        sectorId,
      );

    if (!sector) {
      throw new Error(
        "Setor não encontrado.",
      );
    }

    return prisma.m1MSector.delete({
      where: {
        id: sectorId,
      },
    });
  },
};