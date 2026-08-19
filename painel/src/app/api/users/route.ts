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

export async function GET() {
  try {
    const companyId =
      await getAuthenticatedCompanyId();

    const users =
      await userService.listUsers(
        companyId,
      );

    return NextResponse.json(
      users.map(toSafeUser),
    );
  } catch (error) {
    console.error(
      "ERRO USERS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar os usuários.",
        ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const authorizedUser =
      await authorizationService.requirePermission(
        M1MUserPermission.MANAGE_USERS,
      );

    const companyId =
      authorizedUser.companyId;

    const body = await request.json();

    const user =
      await userService.createUser(
        companyId,
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
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "ERRO USERS POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao criar o usuário.",
        ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}
