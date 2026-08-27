import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  userRepository,
} from "@/repositories/user.repository";

import {
  accessTokenService,
} from "@/services/auth/access-token.service";

import {
  passwordResetEmailService,
} from "@/services/auth/password-reset-email.service";

const PASSWORD_RESET_PURPOSE =
  "PASSWORD_RESET";

const PASSWORD_RESET_TTL_MINUTES =
  60;

const NEUTRAL_MESSAGE =
  "Se o e-mail informado estiver cadastrado, você receberá as instruções para redefinir sua senha.";

function normalizeEmail(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

export async function POST(
  request: NextRequest,
) {
  let email = "";

  try {
    const body =
      await request.json();

    email =
      normalizeEmail(
        body?.email,
      );
  } catch {
    return NextResponse.json({
      success: true,
      message:
        NEUTRAL_MESSAGE,
    });
  }

  try {
    if (
      email &&
      email.includes("@")
    ) {
      const user =
        await userRepository.findByEmail(
          email,
        );

      if (
        user &&
        user.active &&
        user.passwordHash
      ) {
        const {
          token,
        } =
          await accessTokenService.createToken(
            user.id,
            PASSWORD_RESET_PURPOSE,
            PASSWORD_RESET_TTL_MINUTES,
          );

        const appUrl =
          process.env.APP_URL?.trim() ||
          request.nextUrl.origin;

        const resetUrl =
          `${appUrl.replace(/\/$/, "")}/redefinir-senha?token=${encodeURIComponent(
            token,
          )}`;

        await passwordResetEmailService.sendResetEmail({
          email: user.email,
          resetUrl,
          expiresInMinutes:
            PASSWORD_RESET_TTL_MINUTES,
        });
      }
    }
  } catch (error) {
    console.error(
      "ERRO AUTH FORGOT PASSWORD:",
      error,
    );
  }

  return NextResponse.json({
    success: true,
    message:
      NEUTRAL_MESSAGE,
  });
}
