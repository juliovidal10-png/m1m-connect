import {
  M1MUserPermission,
  M1MUserRole,
} from "@/generated/prisma/enums";

import {
  userRepository,
  type UserData,
  type UserUpdateData,
} from "@/repositories/user.repository";

const allowedRoles = new Set<M1MUserRole>([
  M1MUserRole.ADMIN,
  M1MUserRole.MANAGER,
  M1MUserRole.ATTENDANT,
  M1MUserRole.FINANCE,
]);

const clientPermissions =
  new Set<M1MUserPermission>([
    M1MUserPermission.VIEW_ALL_CONVERSATIONS,
    M1MUserPermission.ASSUME_ATTENDANCE,
    M1MUserPermission.TRANSFER_ATTENDANCE,
    M1MUserPermission.CLOSE_ATTENDANCE,
    M1MUserPermission.EDIT_CRM,
    M1MUserPermission.VIEW_RECEIPTS,
    M1MUserPermission.DELETE_CUSTOMERS,
    M1MUserPermission.DELETE_MESSAGES,
    M1MUserPermission.MANAGE_USERS,
    M1MUserPermission.MANAGE_SECTORS,
    M1MUserPermission.MANAGE_HOURS,
    M1MUserPermission.ACCESS_SETTINGS,
  ]);

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

function requireEmail(
  value: string | null | undefined,
) {
  const normalizedEmail = requireText(
    value,
    "E-mail",
  ).toLowerCase();

  if (
    !normalizedEmail.includes("@") ||
    normalizedEmail.startsWith("@") ||
    normalizedEmail.endsWith("@")
  ) {
    throw new Error(
      "Informe um e-mail válido.",
    );
  }

  return normalizedEmail;
}

function normalizeRole(
  value: unknown,
) {
  if (
    typeof value !== "string" ||
    !allowedRoles.has(
      value as M1MUserRole,
    )
  ) {
    throw new Error(
      "Perfil de acesso inválido.",
    );
  }

  return value as M1MUserRole;
}

function normalizeClientPermissions(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    throw new Error(
      "A lista de permissões é inválida.",
    );
  }

  const permissions =
    value.map((permission) => {
      if (
        typeof permission !== "string" ||
        !clientPermissions.has(
          permission as M1MUserPermission,
        )
      ) {
        throw new Error(
          "Uma ou mais permissões não estão disponíveis para usuários da empresa.",
        );
      }

      return permission as M1MUserPermission;
    });

  return Array.from(
    new Set(permissions),
  );
}

export const userService = {
  async listUsers(companyId: string) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    return userRepository.findAllByCompany(
      normalizedCompanyId,
    );
  },

  async createUser(
    companyId: string,
    input: Omit<
      UserData,
      "companyId"
    >,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const name = requireText(
      input.name,
      "Nome",
    );

    const email = requireEmail(
      input.email,
    );

    const existingUser =
      await userRepository.findByEmail(
        email,
      );

    if (existingUser) {
      throw new Error(
        "Já existe um usuário cadastrado com este e-mail.",
      );
    }

    const permissions =
      input.permissions !== undefined
        ? normalizeClientPermissions(
            input.permissions,
          )
        : [];

    return userRepository.create({
      companyId:
        normalizedCompanyId,
      name,
      displayName:
        input.displayName,
      email,
      jobTitle:
        input.jobTitle,
      phone:
        input.phone,
      role:
        input.role ??
        M1MUserRole.ATTENDANT,
      useCustomPermissions:
        input.useCustomPermissions ??
        false,
      permissions:
        input.useCustomPermissions
          ? permissions
          : [],
      active:
        input.active ?? true,
    });
  },

  async updateUser(
    companyId: string,
    userId: string,
    input: UserUpdateData,
  ) {
    const normalizedCompanyId =
      requireText(
        companyId,
        "Empresa",
      );

    const normalizedUserId =
      requireText(
        userId,
        "Usuário",
      );

    const existingUser =
      await userRepository.findById(
        normalizedCompanyId,
        normalizedUserId,
      );

    if (!existingUser) {
      throw new Error(
        "Usuário não encontrado.",
      );
    }

    const data: UserUpdateData = {
      ...input,
    };

    if (input.name !== undefined) {
      data.name = requireText(
        input.name,
        "Nome",
      );
    }

    if (input.email !== undefined) {
      const email = requireEmail(
        input.email,
      );

      const userWithEmail =
        await userRepository.findByEmail(
          email,
        );

      if (
        userWithEmail &&
        userWithEmail.id !==
          normalizedUserId
      ) {
        throw new Error(
          "Já existe outro usuário cadastrado com este e-mail.",
        );
      }

      data.email = email;
    }

    if (input.role !== undefined) {
      data.role =
        normalizeRole(input.role);
    }

    if (
      input.permissions !== undefined
    ) {
      data.permissions =
        normalizeClientPermissions(
          input.permissions,
        );
    }

    if (existingUser.isPrimary) {
      if (
        data.role !== undefined &&
        data.role !==
          M1MUserRole.ADMIN
      ) {
        throw new Error(
          "O usuário principal deve permanecer como Administrador.",
        );
      }

      if (
        data.useCustomPermissions === true
      ) {
        throw new Error(
          "O usuário principal utiliza acesso total pelo perfil Administrador.",
        );
      }

      data.useCustomPermissions = false;
      data.permissions = [];
    }

    if (
      data.useCustomPermissions === false
    ) {
      data.permissions = [];
    }

    return userRepository.update(
      normalizedCompanyId,
      normalizedUserId,
      data,
    );
  },
};
