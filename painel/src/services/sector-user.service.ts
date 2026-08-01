import { sectorUserRepository } from "@/repositories/sector-user.repository";

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

function normalizeUserIds(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    throw new Error(
      "A lista de responsáveis é inválida.",
    );
  }

  const normalizedUserIds = value
    .filter(
      (userId): userId is string =>
        typeof userId === "string",
    )
    .map((userId) => userId.trim())
    .filter(Boolean);

  return Array.from(
    new Set(normalizedUserIds),
  );
}

export const sectorUserService = {
  async getSectorUsers(
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
      await sectorUserRepository.findSector(
        normalizedCompanyId,
        normalizedSectorId,
      );

    if (!sector) {
      throw new Error(
        "Setor não encontrado.",
      );
    }

    const [users, assignedUserIds] =
      await Promise.all([
        sectorUserRepository.findCompanyUsers(
          normalizedCompanyId,
        ),
        sectorUserRepository.findAssignedUserIds(
          normalizedSectorId,
        ),
      ]);

    const assignedUserIdSet =
      new Set(assignedUserIds);

    return {
      sector: {
        id: sector.id,
        name: sector.name,
      },
      users: users.map((user) => ({
        ...user,
        assigned:
          assignedUserIdSet.has(user.id),
      })),
    };
  },

  async updateSectorUsers(
    companyId: string,
    sectorId: string,
    input: unknown,
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
      await sectorUserRepository.findSector(
        normalizedCompanyId,
        normalizedSectorId,
      );

    if (!sector) {
      throw new Error(
        "Setor não encontrado.",
      );
    }

    const userIds =
      normalizeUserIds(input);

    const validUsers =
      await sectorUserRepository.findValidUsers(
        normalizedCompanyId,
        userIds,
      );

    if (
      validUsers.length !==
      userIds.length
    ) {
      throw new Error(
        "Um ou mais usuários não pertencem à empresa.",
      );
    }

    const assignments =
      await sectorUserRepository.replaceSectorUsers(
        normalizedSectorId,
        userIds,
      );

    return {
      sectorId: normalizedSectorId,
      users: assignments.map(
        (assignment) => assignment.user,
      ),
    };
  },
};
