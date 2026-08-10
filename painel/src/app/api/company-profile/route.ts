import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  companyProfileService,
} from "@/services/company-profile.service";

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

export async function GET() {
  try {
    const companyId =
      await getAuthenticatedCompanyId();

    const profile =
      await companyProfileService.getCompanyProfile(
        companyId,
      );

    return NextResponse.json(
      profile,
    );
  } catch (error) {
    console.error(
      "ERRO COMPANY PROFILE GET:",
      error,
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
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
) {
  try {
    const companyId =
      await getAuthenticatedCompanyId();

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
      "ERRO COMPANY PROFILE PUT:",
      error,
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
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
