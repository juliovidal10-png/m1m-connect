import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  authService,
} from "@/services/auth/auth.service";

import {
  accessTokenService,
} from "@/services/auth/access-token.service";

const PASSWORD_RESET_PURPOSE =
  "PASSWORD_RESET";

function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Não foi possível redefinir a senha.";
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      await request.json();

    const token =
      typeof body?.token === "string"
        ? body.token.trim()
        : "";

    const password =
      typeof body?.password === "string"
        ? body.password
        : "";

    if (!token) {
      throw new Error(
        "Link de recuperação inválido.",
      );
    }

    if (password.length < 8) {
      throw new Error(
        "A senha deve ter pelo menos 8 caracteres.",
      );
    }

    const tokenRecord =
      await accessTokenService.validateToken(
        token,
        PASSWORD_RESET_PURPOSE,
      );

    if (
      !tokenRecord ||
      !tokenRecord.user.passwordHash
    ) {
      return NextResponse.json(
        {
          passwordReset: false,
          error:
            "Link de recuperação inválido, expirado ou já utilizado.",
        },
        {
          status: 400,
        },
      );
    }

    const consumed =
      await accessTokenService.consumeToken(
        token,
        PASSWORD_RESET_PURPOSE,
      );

    if (!consumed) {
      return NextResponse.json(
        {
          passwordReset: false,
          error:
            "Link de recuperação inválido, expirado ou já utilizado.",
        },
        {
          status: 400,
        },
      );
    }

    await authService.definePassword(
      tokenRecord.user.email,
      password,
    );

    return NextResponse.json({
      passwordReset: true,
    });
  } catch (error) {
    console.error(
      "ERRO AUTH RESET PASSWORD:",
      error,
    );

    return NextResponse.json(
      {
        passwordReset: false,
        error:
          getErrorMessage(
            error,
          ),
      },
      {
        status: 400,
      },
    );
  }
}
