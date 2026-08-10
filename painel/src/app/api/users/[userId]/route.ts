import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import { userService } from "@/services/user.service";

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
    const companyId =
      await getAuthenticatedCompanyId();

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
        status: 500,
      },
    );
  }
}
