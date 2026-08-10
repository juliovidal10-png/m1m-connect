import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  companyRepository,
} from "@/repositories/company.repository";

import {
  userRepository,
} from "@/repositories/user.repository";

import {
  sessionService,
} from "@/services/auth/session.service";

const SESSION_COOKIE_NAME =
  "m1m_session";

export async function GET(
  request: NextRequest,
) {
  try {
    const token =
      request.cookies.get(
        SESSION_COOKIE_NAME,
      )?.value;

    if (!token) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          status: 401,
        },
      );
    }

    const session =
      await sessionService.verifyToken(
        token,
      );

    const user =
      await userRepository.findById(
        session.companyId,
        session.userId,
      );

    if (!user || !user.active) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          status: 401,
        },
      );
    }

    const company =
      await companyRepository.findById(
        session.companyId,
      );

    if (!company || !company.active) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        companyId: user.companyId,
        name: user.name,
        displayName:
          user.displayName,
        email: user.email,
        role: user.role,
        useCustomPermissions:
          user.useCustomPermissions,
        permissions:
          user.permissions,
      },
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        onboardingCompleted:
          company.onboardingCompleted,
        aiEnabled:
          company.aiEnabled,
      },
    });
  } catch (error) {
    console.error(
      "ERRO AUTH ME:",
      error,
    );

    return NextResponse.json(
      {
        authenticated: false,
      },
      {
        status: 401,
      },
    );
  }
}
