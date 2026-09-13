import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  userRepository,
} from "@/repositories/user.repository";
import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  accessTokenService,
} from "@/services/auth/access-token.service";

const FIRST_ACCESS_PURPOSE =
  "FIRST_ACCESS";

const FIRST_ACCESS_TTL_MINUTES =
  24 * 60;

type RouteContext = {
  params: Promise<{
    companyId: string;
    userId: string;
  }>;
};

export async function POST(
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

    const user =
      await userRepository.findById(
        companyId,
        userId,
      );

    if (!user) {
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

    if (!user.active) {
      return NextResponse.json(
        {
          error:
            "Ative o usuário antes de gerar o convite.",
        },
        {
          status: 409,
        },
      );
    }

    if (user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "Este usuário já concluiu o primeiro acesso.",
        },
        {
          status: 409,
        },
      );
    }

    const firstAccess =
      await accessTokenService.createToken(
        user.id,
        FIRST_ACCESS_PURPOSE,
        FIRST_ACCESS_TTL_MINUTES,
      );

    return NextResponse.json({
      token: firstAccess.token,
      expiresAt:
        firstAccess.expiresAt,
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY USER FIRST ACCESS POST:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao gerar o convite de primeiro acesso.",
      },
      {
        status: 400,
      },
    );
  }
}
