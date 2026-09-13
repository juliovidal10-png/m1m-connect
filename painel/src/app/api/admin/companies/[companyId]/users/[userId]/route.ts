import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";
import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import { userService } from "@/services/user.service";

type RouteContext = {
  params: Promise<{
    companyId: string;
    userId: string;
  }>;
};

function normalizeOptionalText(
  value: unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized ||
    null;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  if (
    !adminAuthService.isAuthorizedRequest(
      request,
    )
  ) {
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

  try {
    const {
      companyId,
      userId,
    } = await context.params;

    const body =
      await request.json();

    const current =
      await prisma.m1MUser.findFirst({
        where: {
          id: userId,
          companyId,
        },
        select: {
          id: true,
          role: true,
          email: true,
        },
      });

    if (!current) {
      return NextResponse.json(
        {
          error:
            "Usuário não encontrado nesta empresa.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      current.role !==
      "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "Nesta etapa, apenas administradores podem ser editados pelo M1M Admin.",
        },
        {
          status: 400,
        },
      );
    }

    const name =
      typeof body?.name ===
      "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body?.email ===
      "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Informe o nome do administrador.",
        },
        {
          status: 400,
        },
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Informe o e-mail do administrador.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      email !==
      current.email.toLowerCase()
    ) {
      const duplicate =
        await prisma.m1MUser.findUnique({
          where: {
            email,
          },
          select: {
            id: true,
          },
        });

      if (
        duplicate &&
        duplicate.id !==
          userId
      ) {
        return NextResponse.json(
          {
            error:
              "Este e-mail já está sendo utilizado por outro usuário.",
          },
          {
            status: 409,
          },
        );
      }
    }

    const user =
      await prisma.m1MUser.update({
        where: {
          id: userId,
        },
        data: {
          name,
          displayName:
            normalizeOptionalText(
              body?.displayName,
            ),
          email,
          phone:
            normalizeOptionalText(
              body?.phone,
            ),
          jobTitle:
            normalizeOptionalText(
              body?.jobTitle,
            ),
          active:
            body?.active ===
            false
              ? false
              : true,
        },
        select: {
          id: true,
          companyId: true,
          name: true,
          displayName: true,
          email: true,
          phone: true,
          jobTitle: true,
          role: true,
          active: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY USER PATCH:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o administrador.",
      },
      {
        status: 400,
      },
    );
  }
}
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

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  if (
    !adminAuthService.isAuthorizedRequest(
      request,
    )
  ) {
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

  try {
    const {
      companyId,
      userId,
    } = await context.params;

    const body =
      await request.json();

    const user =
      await userService.updateUser(
        companyId,
        userId,
        {
          name: body.name,
          displayName: body.displayName,
          email: body.email,
          jobTitle: body.jobTitle,
          phone: body.phone,
          role: body.role,
          useCustomPermissions:
            body.useCustomPermissions,
          permissions: body.permissions,
          active: body.active,
        },
      );

    return NextResponse.json(
      toSafeUser(user),
    );
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY USER PUT:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar o usuário.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  if (
    !adminAuthService.isAuthorizedRequest(
      request,
    )
  ) {
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

  try {
    const {
      companyId,
      userId,
    } = await context.params;

    const deletedUser =
      await userService.deleteUser(
        companyId,
        userId,
      );

    return NextResponse.json({
      success: true,
      user: toSafeUser(deletedUser),
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY USER DELETE:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao excluir o usuário.",
      },
      {
        status: 400,
      },
    );
  }
}
