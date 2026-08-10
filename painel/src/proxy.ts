import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  sessionService,
} from "@/services/auth/session.service";

const SESSION_COOKIE_NAME =
  "m1m_session";

const PUBLIC_PATHS = new Set([
  "/login",
]);

export async function proxy(
  request: NextRequest,
) {
  const {
    pathname,
  } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!token) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.search = "";

    return NextResponse.redirect(
      loginUrl,
    );
  }

  try {
    await sessionService.verifyToken(
      token,
    );

    return NextResponse.next();
  } catch {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.search = "";

    const response =
      NextResponse.redirect(
        loginUrl,
      );

    response.cookies.delete(
      SESSION_COOKIE_NAME,
    );

    return response;
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)",
  ],
};
