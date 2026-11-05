import {
  M1MUserPermission,
  M1MUserRole,
} from "@/generated/prisma/enums";

import {
  getAuthenticatedSession,
} from "@/lib/tenant";

import {
  userRepository,
} from "@/repositories/user.repository";

export class AuthorizationError extends Error {
  statusCode = 403;

  constructor(
    message =
      "Você não possui permissão para realizar esta ação.",
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export type AuthenticatedUserContext = {
  userId: string;
  companyId: string;
  role: M1MUserRole;
  isPrimary: boolean;
  useCustomPermissions: boolean;
  permissions: M1MUserPermission[];
};

function normalizePermissions(
  value: unknown,
): M1MUserPermission[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      permission,
    ): permission is M1MUserPermission =>
      typeof permission === "string" &&
      Object.values(
        M1MUserPermission,
      ).includes(
        permission as M1MUserPermission,
      ),
  );
}

const protectedM1MPermissions =
  new Set<M1MUserPermission>([
    M1MUserPermission.MANAGE_AI,
    M1MUserPermission.MANAGE_KNOWLEDGE,
  ]);

const rolePermissions: Record<
  M1MUserRole,
  ReadonlySet<M1MUserPermission>
> = {
  [M1MUserRole.ADMIN]:
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
    ]),

  [M1MUserRole.MANAGER]:
    new Set<M1MUserPermission>([
      M1MUserPermission.VIEW_ALL_CONVERSATIONS,
      M1MUserPermission.ASSUME_ATTENDANCE,
      M1MUserPermission.TRANSFER_ATTENDANCE,
      M1MUserPermission.CLOSE_ATTENDANCE,
      M1MUserPermission.EDIT_CRM,
      M1MUserPermission.VIEW_RECEIPTS,
      M1MUserPermission.MANAGE_USERS,
      M1MUserPermission.MANAGE_SECTORS,
      M1MUserPermission.MANAGE_HOURS,
      M1MUserPermission.ACCESS_SETTINGS,
    ]),

  [M1MUserRole.ATTENDANT]:
    new Set<M1MUserPermission>([
      M1MUserPermission.ASSUME_ATTENDANCE,
      M1MUserPermission.TRANSFER_ATTENDANCE,
      M1MUserPermission.CLOSE_ATTENDANCE,
      M1MUserPermission.EDIT_CRM,
    ]),

  [M1MUserRole.FINANCE]:
    new Set<M1MUserPermission>([
      M1MUserPermission.ASSUME_ATTENDANCE,
      M1MUserPermission.TRANSFER_ATTENDANCE,
      M1MUserPermission.CLOSE_ATTENDANCE,
      M1MUserPermission.EDIT_CRM,
      M1MUserPermission.VIEW_RECEIPTS,
    ]),
};

export const authorizationService = {
  async getCurrentUser(): Promise<AuthenticatedUserContext> {
    const session =
      await getAuthenticatedSession();

    const user =
      await userRepository.findById(
        session.companyId,
        session.userId,
      );

    if (!user || !user.active) {
      throw new AuthorizationError(
        "Usuário autenticado não encontrado ou inativo.",
      );
    }

    return {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      isPrimary: user.isPrimary,
      useCustomPermissions:
        user.useCustomPermissions,
      permissions:
        normalizePermissions(
          user.permissions,
        ),
    };
  },

  hasPermission(
    user: AuthenticatedUserContext,
    permission: M1MUserPermission,
  ) {
    if (
      protectedM1MPermissions.has(
        permission,
      )
    ) {
      return false;
    }

    if (
      user.isPrimary
    ) {
      return true;
    }

    if (
      user.useCustomPermissions
    ) {
      return user.permissions.includes(
        permission,
      );
    }

    return (
      rolePermissions[
        user.role
      ]?.has(
        permission,
      ) ?? false
    );
  },

  getEffectivePermissions(
    user: AuthenticatedUserContext,
  ): M1MUserPermission[] {
    return Object.values(M1MUserPermission).filter(
      (permission) => this.hasPermission(user, permission),
    );
  },

  async requirePermission(
    permission: M1MUserPermission,
  ) {
    const user =
      await this.getCurrentUser();

    if (
      !this.hasPermission(
        user,
        permission,
      )
    ) {
      throw new AuthorizationError();
    }

    return user;
  },

  async requireAdmin() {
    const user =
      await this.getCurrentUser();

    if (
      !user.isPrimary &&
      user.role !== M1MUserRole.ADMIN
    ) {
      throw new AuthorizationError(
        "Acesso permitido somente para administradores.",
      );
    }

    return user;
  },
};
