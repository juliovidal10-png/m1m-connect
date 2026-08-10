import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  authService,
} from "@/services/auth/auth.service";

import {
  sessionService,
} from "@/services/auth/session.service";

const SESSION_COOKIE_NAME = "m1m_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível entrar.";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const user = await authService.authenticate(
      body.email,
      body.password,
    );

    const token = await sessionService.createToken({
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        companyId: user.companyId,
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        useCustomPermissions: user.useCustomPermissions,
        permissions: user.permissions,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("ERRO AUTH LOGIN:", error);

    return NextResponse.json(
      {
        authenticated: false,
        error: getErrorMessage(error),
      },
      {
        status: 401,
      },
    );
  }
}
