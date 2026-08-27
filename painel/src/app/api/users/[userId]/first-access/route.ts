import { NextResponse } from "next/server";

import { M1MUserPermission } from "@/generated/prisma/enums";

import { userRepository } from "@/repositories/user.repository";
import {
  AuthorizationError,
  authorizationService,
} from "@/services/auth/authorization.service";
import { accessTokenService } from "@/services/auth/access-token.service";

const FIRST_ACCESS_PURPOSE = "FIRST_ACCESS";

const FIRST_ACCESS_TTL_MINUTES = 24 * 60;

function getErrorStatus(error: unknown) {
  return error instanceof AuthorizationError ? error.statusCode : 500;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const authorizedUser = await authorizationService.requirePermission(
      M1MUserPermission.MANAGE_USERS,
    );

    const companyId = authorizedUser.companyId;

    const { userId } = await context.params;

    const user = await userRepository.findById(companyId, userId);

    if (!user) {
      return NextResponse.json(
        {
          error: "UsuÃ¡rio nÃ£o encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    if (!user.active) {
      return NextResponse.json(
        {
          error: "Ative o usuÃ¡rio antes de gerar o convite.",
        },
        {
          status: 409,
        },
      );
    }

    if (user.passwordHash) {
      return NextResponse.json(
        {
          error: "Este usuÃ¡rio jÃ¡ concluiu o primeiro acesso.",
        },
        {
          status: 409,
        },
      );
    }

    const firstAccess = await accessTokenService.createToken(
      user.id,
      FIRST_ACCESS_PURPOSE,
      FIRST_ACCESS_TTL_MINUTES,
    );

    return NextResponse.json({
      token: firstAccess.token,
      expiresAt: firstAccess.expiresAt,
    });
  } catch (error) {
    console.error("ERRO USERS FIRST ACCESS POST:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao gerar o convite de primeiro acesso.",
        ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}
