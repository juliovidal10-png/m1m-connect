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
  companyAccessService,
} from "@/services/company-access.service";

import {
  sessionService,
} from "@/services/auth/session.service";

import {
  authorizationService,
} from "@/services/auth/authorization.service";

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

    const access =
      await companyAccessService.checkCompanyAccess(
        company.id,
      );

    const authorizationUser = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      isPrimary: user.isPrimary,
      useCustomPermissions:
        user.useCustomPermissions,
      permissions:
        user.permissions,
    };

    const effectivePermissions =
      authorizationService.getEffectivePermissions(
        authorizationUser,
      );

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
        effectivePermissions,
      },
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        onboardingCompleted:
          company.onboardingCompleted,
        aiEnabled:
          company.aiEnabled,
        subscriptionStatus:
          access.status,
        trialEndsAt:
          access.trialEndsAt,
        accessEndsAt:
          access.accessEndsAt,
        accessAllowed:
          access.allowed,
        accessReason:
          access.reason,
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
