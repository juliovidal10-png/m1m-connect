import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  accessTokenService,
} from "@/services/auth/access-token.service";

const PASSWORD_RESET_PURPOSE =
  "PASSWORD_RESET";

export async function GET(
  request: NextRequest,
) {
  const token =
    request.nextUrl.searchParams
      .get("token")
      ?.trim() || "";

  if (!token) {
    return NextResponse.json(
      {
        valid: false,
      },
      {
        status: 400,
      },
    );
  }

  const record =
    await accessTokenService.validateToken(
      token,
      PASSWORD_RESET_PURPOSE,
    );

  if (
    !record ||
    !record.user.passwordHash
  ) {
    return NextResponse.json(
      {
        valid: false,
      },
      {
        status: 400,
      },
    );
  }

  return NextResponse.json({
    valid: true,
  });
}
