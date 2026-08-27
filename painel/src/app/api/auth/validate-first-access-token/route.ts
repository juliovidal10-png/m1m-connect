import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  accessTokenService,
} from "@/services/auth/access-token.service";

const FIRST_ACCESS_PURPOSE =
  "FIRST_ACCESS";

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      await request.json();

    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : "";

    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          error:
            "Link de primeiro acesso inválido ou incompleto.",
        },
        {
          status: 400,
        },
      );
    }

    const tokenRecord =
      await accessTokenService.validateToken(
        token,
        FIRST_ACCESS_PURPOSE,
      );

    if (
      !tokenRecord ||
      tokenRecord.user.passwordHash
    ) {
      return NextResponse.json(
        {
          valid: false,
          error:
            "Link de primeiro acesso inválido, expirado ou já utilizado.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      valid: true,
    });
  } catch (error) {
    console.error(
      "ERRO VALIDATE FIRST ACCESS TOKEN:",
      error,
    );

    return NextResponse.json(
      {
        valid: false,
        error:
          "Link de primeiro acesso inválido, expirado ou já utilizado.",
      },
      {
        status: 400,
      },
    );
  }
}