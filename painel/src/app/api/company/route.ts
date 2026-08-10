import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getAuthenticatedCompanyId } from "@/lib/tenant";
import { companyService } from "@/services/company.service";

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

    const company =
      await companyService.getCompanyProfile(
        companyId,
      );

    return NextResponse.json(company);
  } catch (error) {
    console.error(
      "ERRO COMPANY GET:",
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
) {
  try {
    const companyId =
      await getAuthenticatedCompanyId();

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
      "ERRO COMPANY PUT:",
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
