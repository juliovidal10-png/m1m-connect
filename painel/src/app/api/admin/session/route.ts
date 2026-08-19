import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
  M1M_ADMIN_SESSION_COOKIE,
} from "@/services/admin/admin-auth.service";

const SESSION_MAX_AGE_SECONDS =
  8 * 60 * 60;

export async function GET(
  request: NextRequest,
) {
  return NextResponse.json({
    authenticated:
      adminAuthService.isAuthorizedRequest(
        request,
      ),
    configured:
      adminAuthService.isConfigured(),
  });
}

export async function POST(
  request: NextRequest,
) {
  if (
    !adminAuthService.isConfigured()
  ) {
    return NextResponse.json(
      {
        error:
          "A chave administrativa da M1M não está configurada.",
      },
      {
        status: 503,
      },
    );
  }

  let body: {
    adminKey?: string;
  };

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Requisição inválida.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !adminAuthService.validateAdminKey(
      body.adminKey,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Chave administrativa inválida.",
      },
      {
        status: 401,
      },
    );
  }

  const response =
    NextResponse.json({
      authenticated: true,
    });

  response.cookies.set(
    M1M_ADMIN_SESSION_COOKIE,
    adminAuthService.getSessionToken(),
    {
      httpOnly: true,
      sameSite: "strict",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        SESSION_MAX_AGE_SECONDS,
    },
  );

  return response;
}

export async function DELETE() {
  const response =
    NextResponse.json({
      authenticated: false,
    });

  response.cookies.set(
    M1M_ADMIN_SESSION_COOKIE,
    "",
    {
      httpOnly: true,
      sameSite: "strict",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge: 0,
    },
  );

  return response;
}
