import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentCompanyId,
} from "@/lib/tenant";
import {
  outOfHoursService,
} from "@/services/out-of-hours.service";

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
      getCurrentCompanyId();

    const result =
      await outOfHoursService.getCompanyMessage(
        companyId,
      );

    return NextResponse.json({
      message: result,
    });
  } catch (error) {
    console.error(
      "ERRO COMPANY OUT OF HOURS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar a mensagem fora do expediente.",
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
      getCurrentCompanyId();

    const body =
      await request.json();

    const company =
      await outOfHoursService.updateCompanyMessage(
        companyId,
        body.message,
      );

    return NextResponse.json(
      company,
    );
  } catch (error) {
    console.error(
      "ERRO COMPANY OUT OF HOURS PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao salvar a mensagem fora do expediente.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}
