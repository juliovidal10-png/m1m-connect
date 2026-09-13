import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  companyProfileService,
} from "@/services/company-profile.service";

type RouteContext = {
  params: Promise<{
    companyId: string;
  }>;
};

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  if (
    !adminAuthService.isAuthorizedRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Acesso administrativo não autorizado.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const {
      companyId,
    } = await context.params;

    const profile =
      await companyProfileService.getCompanyProfile(
        companyId,
      );

    return NextResponse.json(
      profile,
    );
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY KNOWLEDGE PROFILE GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar o Perfil da Empresa.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  if (
    !adminAuthService.isAuthorizedRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Acesso administrativo não autorizado.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const {
      companyId,
    } = await context.params;

    const body =
      await request.json();

    const profile =
      await companyProfileService.saveCompanyProfile(
        companyId,
        {
          presentation:
            body.presentation,
          differentials:
            body.differentials,
          productsServices:
            body.productsServices,
          targetAudience:
            body.targetAudience,
          serviceArea:
            body.serviceArea,
          companyPolicies:
            body.companyPolicies,
          importantInformation:
            body.importantInformation,
          frequentlyAskedQuestions:
            body.frequentlyAskedQuestions,
        },
      );

    return NextResponse.json(
      profile,
    );
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY KNOWLEDGE PROFILE PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao salvar o Perfil da Empresa.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}
