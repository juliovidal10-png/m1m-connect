import {
  sectorRepository,
  type SectorData,
  type SectorUpdateData,
} from "@/repositories/sector.repository";

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

function normalizeSortOrder(
  value: unknown,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  const normalizedValue =
    Number(value);

  if (
    !Number.isInteger(
      normalizedValue,
    ) ||
    normalizedValue < 0
  ) {
    throw new Error(
      "A ordem do setor deve ser um número inteiro maior ou igual a zero.",
    );
  }

  return normalizedValue;
}

export const sectorService = {
  async listSectors(
    companyId: string,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    return sectorRepository.findAllByCompany(
      normalizedCompanyId,
    );
  },

  async listActiveSectors(
    companyId: string,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    return sectorRepository.findActiveByCompany(
      normalizedCompanyId,
    );
  },

  async getSector(
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

    const sector =
      await sectorRepository.findById(
        normalizedCompanyId,
        normalizedSectorId,
      );

    if (!sector) {
      throw new Error(
        "Setor não encontrado.",
      );
    }

    return sector;
  },

  async createSector(
    companyId: string,
    input: Omit<
      SectorData,
      "companyId"
    >,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const name =
      requireText(
        input.name,
        "Nome do setor",
      );

    return sectorRepository.create({
      companyId:
        normalizedCompanyId,
      name,
      description:
        input.description,
      knowledge:
        input.knowledge,
      active:
        input.active ?? true,
      sortOrder:
        normalizeSortOrder(
          input.sortOrder,
        ),
    });
  },

  async updateSector(
    companyId: string,
    sectorId: string,
    input: SectorUpdateData,
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

    const existingSector =
      await sectorRepository.findById(
        normalizedCompanyId,
        normalizedSectorId,
      );

    if (!existingSector) {
      throw new Error(
        "Setor não encontrado.",
      );
    }

    const data: SectorUpdateData = {
      ...input,
    };

    if (
      input.name !== undefined
    ) {
      data.name =
        requireText(
          input.name,
          "Nome do setor",
        );
    }

    if (
      input.sortOrder !==
      undefined
    ) {
      data.sortOrder =
        normalizeSortOrder(
          input.sortOrder,
        );
    }

    return sectorRepository.update(
      normalizedCompanyId,
      normalizedSectorId,
      data,
    );
  },

  async deleteSector(
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

    return sectorRepository.delete(
      normalizedCompanyId,
      normalizedSectorId,
    );
  },
};