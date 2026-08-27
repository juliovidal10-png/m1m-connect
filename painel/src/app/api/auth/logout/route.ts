import {
  NextResponse,
} from "next/server";

const SESSION_COOKIE_NAME =
  "m1m_session";

export async function DELETE() {
  const response =
    NextResponse.json({
      authenticated: false,
    });

  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  );

  return response;
}
