import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  userService,
} from "@/services/user.service";

type RouteContext = {
  params: Promise<{
    companyId: string;
  }>;
};

function toSafeUser<
  T extends {
    id: string;
    companyId: string;
    name: string;
    displayName: string | null;
    email: string;
    passwordHash: string | null;
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
    hasPassword: Boolean(user.passwordHash),
    jobTitle: user.jobTitle,
    phone: user.phone,
    role: user.role,
    useCustomPermissions: user.useCustomPermissions,
    permissions: user.permissions,
    active: user.active,
    isPrimary: user.isPrimary,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function unauthorized() {
  return NextResponse.json(
    {
      error:
        "Acesso administrativo não autorizado.",
    },
    {
      status: 401,
    },
  );
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  if (
    !adminAuthService.isAuthorizedRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  try {
    const {
      companyId,
    } = await context.params;

    const users =
      await userService.listUsers(
        companyId,
      );

    return NextResponse.json(
      users.map(toSafeUser),
    );
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY USERS GET:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar os usuários.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  if (
    !adminAuthService.isAuthorizedRequest(
      request,
    )
  ) {
    return unauthorized();
  }

  try {
    const {
      companyId,
    } = await context.params;

    const body =
      await request.json();

    const user =
      await userService.createUser(
        companyId,
        {
          name: body.name,
          displayName:
            body.displayName,
          email: body.email,
          jobTitle: body.jobTitle,
          phone: body.phone,
          role: body.role,
          useCustomPermissions:
            body.useCustomPermissions,
          permissions:
            body.permissions,
          active: body.active,
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
      "ERRO ADMIN COMPANY USERS POST:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao criar o usuário.",
      },
      {
        status: 400,
      },
    );
  }
}
