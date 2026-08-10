import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  userRepository,
} from "@/repositories/user.repository";

import {
  authService,
} from "@/services/auth/auth.service";

function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Não foi possível definir a senha.";
}

export async function POST(
  request: NextRequest,
) {
  try {
    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      return NextResponse.json(
        {
          error:
            "Esta rota não está disponível em produção.",
        },
        {
          status: 404,
        },
      );
    }

    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      throw new Error(
        "Informe o e-mail.",
      );
    }

    const user =
      await userRepository.findByEmail(
        email,
      );

    if (!user || !user.active) {
      throw new Error(
        "Usuário não encontrado ou inativo.",
      );
    }

    if (user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "Este usuário já possui senha definida.",
        },
        {
          status: 409,
        },
      );
    }

    await authService.definePassword(
      email,
      body.password,
    );

    return NextResponse.json({
      passwordConfigured: true,
      email,
    });
  } catch (error) {
    console.error(
      "ERRO AUTH SETUP PASSWORD:",
      error,
    );

    return NextResponse.json(
      {
        passwordConfigured: false,
        error: getErrorMessage(error),
      },
      {
        status: 400,
      },
    );
  }
}
