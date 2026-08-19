import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  companyAccessService,
} from "@/services/company-access.service";

import {
  sessionService,
} from "@/services/auth/session.service";

const SESSION_COOKIE_NAME =
  "m1m_session";

const DEVELOPMENT_COMPANY_ID =
  process.env.M1M_DEFAULT_COMPANY_ID?.trim() ||
  "empresa-teste";

async function resolveCompanyId(
  request: NextRequest,
) {
  const token =
    request.cookies.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (token) {
    try {
      const session =
        await sessionService.verifyToken(
          token,
        );

      if (session.companyId) {
        return session.companyId;
      }
    } catch (error) {
      if (
        process.env.NODE_ENV ===
        "production"
      ) {
        throw error;
      }

      console.warn(
        "[COMPANY ACCESS STATUS] Sessao ausente/invalida em desenvolvimento; usando empresa padrao.",
      );
    }
  }

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    return DEVELOPMENT_COMPANY_ID;
  }

  throw new Error(
    "Sessão não encontrada.",
  );
}

export async function GET(
  request: NextRequest,
) {
  try {
    const companyId =
      await resolveCompanyId(
        request,
      );

    const access =
      await companyAccessService.checkCompanyAccess(
        companyId,
      );

    return NextResponse.json({
      companyId,
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
    });
  } catch (error) {
    console.error(
      "[COMPANY ACCESS STATUS]",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível verificar o acesso da empresa.",
      },
      {
        status: 401,
      },
    );
  }
}
