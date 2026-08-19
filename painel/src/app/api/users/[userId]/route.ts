import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  M1MUserPermission,
} from "@/generated/prisma/enums";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  AuthorizationError,
  authorizationService,
} from "@/services/auth/authorization.service";
import { userService } from "@/services/user.service";

function getErrorStatus(
  error: unknown,
) {
  return error instanceof AuthorizationError
    ? error.statusCode
    : 500;
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

function toSafeUser<
  T extends {
    id: string;
    companyId: string;
    name: string;
    displayName: string | null;
    email: string;
    jobTitle: string | null;
    phone: string | null;
    role: unknown;
    useCustomPermissions: boolean;
    permissions: unknown;
    active: boolean;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
>(user: T) {
  return {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    displayName: user.displayName,
    email: user.email,
    jobTitle: user.jobTitle,
    phone: user.phone,
    role: user.role,
    useCustomPermissions:
      user.useCustomPermissions,
    permissions: user.permissions,
    active: user.active,
    isPrimary: user.isPrimary,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const authorizedUser =
      await authorizationService.requirePermission(
        M1MUserPermission.MANAGE_USERS,
      );

    const companyId =
      authorizedUser.companyId;

    const { userId } =
      await context.params;

    const body = await request.json();

    const user =
      await userService.updateUser(
        companyId,
        userId,
        {
          name: body.name,
          displayName:
            body.displayName,
          email: body.email,
          jobTitle:
            body.jobTitle,
          phone:
            body.phone,
          role:
            body.role,
          useCustomPermissions:
            body.useCustomPermissions,
          permissions:
            body.permissions,
          active:
            body.active,
        },
      );

    return NextResponse.json(
      toSafeUser(user),
    );
  } catch (error) {
    console.error(
      "ERRO USERS PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao atualizar o usuário.",
        ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}
