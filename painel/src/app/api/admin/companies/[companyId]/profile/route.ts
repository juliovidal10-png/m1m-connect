import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  companyService,
} from "@/services/company.service";

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

    const company =
      await companyService.getCompanyProfile(
        companyId,
      );

    return NextResponse.json(company);
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY PROFILE GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar a empresa.",
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

    const body = await request.json();

    const company =
      await companyService.updateCompanyProfile(
        companyId,
        {
          name: body.name,
          segment: body.segment,
          presentation: body.presentation,
          address: body.address,
          city: body.city,
          state: body.state,
          zipCode: body.zipCode,
          locationLink: body.locationLink,
          phone: body.phone,
          whatsapp: body.whatsapp,
          email: body.email,
          website: body.website,
          instagram: body.instagram,
          humanReturnMode:
            body.humanReturnMode,
          humanClosingMessage:
            body.humanClosingMessage,
          aiEnabled:
            body.aiEnabled,
        },
      );

    return NextResponse.json(company);
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY PROFILE PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao salvar a empresa.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}
