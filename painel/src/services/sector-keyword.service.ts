import {
  sectorKeywordRepository,
} from "@/repositories/sector-keyword.repository";
import {
  sectorRepository,
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

function normalizeKeyword(
  keyword: string,
) {
  return keyword
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLocaleLowerCase("pt-BR")
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

export const sectorKeywordService = {
  async list(
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

    return sectorKeywordRepository.listBySector(
      normalizedCompanyId,
      normalizedSectorId,
    );
  },

  async listByCompany(
    companyId: string,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    return sectorKeywordRepository.listByCompany(
      normalizedCompanyId,
    );
  },

  async create(
    companyId: string,
    sectorId: string,
    keyword: string,
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

    const normalizedKeyword =
      normalizeKeyword(
        requireText(
          keyword,
          "Palavra-chave",
        ),
      );

    if (
      normalizedKeyword.length < 2
    ) {
      throw new Error(
        "A palavra-chave deve possuir pelo menos 2 caracteres.",
      );
    }

    const existing =
      await sectorKeywordRepository.findByKeyword(
        normalizedCompanyId,
        normalizedSectorId,
        normalizedKeyword,
      );

    if (existing) {
      throw new Error(
        "Essa palavra-chave já existe neste setor.",
      );
    }

    return sectorKeywordRepository.create(
      normalizedCompanyId,
      {
        sectorId:
          normalizedSectorId,
        keyword:
          normalizedKeyword,
      },
    );
  },

  async remove(
    companyId: string,
    keywordId: string,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const normalizedKeywordId =
      requireText(
        keywordId,
        "Palavra-chave",
      );

    return sectorKeywordRepository.delete(
      normalizedCompanyId,
      normalizedKeywordId,
    );
  },
};
