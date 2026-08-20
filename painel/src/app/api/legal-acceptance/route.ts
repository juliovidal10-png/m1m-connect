import { NextResponse } from "next/server";

import { M1MUserRole } from "@/generated/prisma/enums";
import { legalAcceptanceRepository } from "@/repositories/legal-acceptance.repository";
import { authorizationService } from "@/services/auth/authorization.service";

const LEGAL_DOCUMENT = "M1M_CONNECT_LEGAL_TERMS";
const LEGAL_VERSION = "1.0";

function requiresLegalAcceptance(user: {
  isPrimary: boolean;
  role: M1MUserRole;
}) {
  return (
    user.isPrimary ||
    user.role === M1MUserRole.ADMIN ||
    user.role === M1MUserRole.MANAGER
  );
}

export async function GET() {
  try {
    const user = await authorizationService.getCurrentUser();

    const required =
      requiresLegalAcceptance(user);

    if (!required) {
      return NextResponse.json({
        required: false,
        accepted: true,
        document: LEGAL_DOCUMENT,
        version: LEGAL_VERSION,
      });
    }

    const acceptance =
      await legalAcceptanceRepository.findAcceptance(
        user.companyId,
        user.userId,
        LEGAL_DOCUMENT,
        LEGAL_VERSION,
      );

    return NextResponse.json({
      required: true,
      accepted: Boolean(acceptance),
      document: LEGAL_DOCUMENT,
      version: LEGAL_VERSION,
      acceptedAt: acceptance?.acceptedAt ?? null,
    });
  } catch (error) {
    console.error("ERRO LEGAL ACCEPTANCE GET:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível verificar o aceite eletrônico.",
      },
      {
        status: 401,
      },
    );
  }
}

export async function POST() {
  try {
    const user = await authorizationService.getCurrentUser();

    if (!requiresLegalAcceptance(user)) {
      return NextResponse.json(
        {
          error:
            "Este usuário não possui aceite obrigatório pendente.",
        },
        {
          status: 403,
        },
      );
    }

    const acceptance =
      await legalAcceptanceRepository.saveAcceptance(
        user.companyId,
        user.userId,
        LEGAL_DOCUMENT,
        LEGAL_VERSION,
      );

    return NextResponse.json({
      accepted: true,
      document: acceptance.document,
      version: acceptance.version,
      acceptedAt: acceptance.acceptedAt,
    });
  } catch (error) {
    console.error("ERRO LEGAL ACCEPTANCE POST:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível registrar o aceite eletrônico.",
      },
      {
        status: 500,
      },
    );
  }
}
