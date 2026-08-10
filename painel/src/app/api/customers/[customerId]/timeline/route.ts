import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  timelineService,
} from "@/services/timeline.service";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Erro ao carregar a linha do tempo do cliente.";
}

function parseLimit(
  value: string | null,
) {
  if (!value) {
    return undefined;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const companyId =
      await getAuthenticatedCompanyId();

    const {
      customerId,
    } = await context.params;

    if (!customerId?.trim()) {
      return NextResponse.json(
        {
          error:
            "Cliente não identificado.",
        },
        {
          status: 400,
        },
      );
    }

    const timeline =
      await timelineService.listCustomerTimeline(
        companyId,
        customerId,
        parseLimit(
          request.nextUrl.searchParams.get(
            "limit",
          ),
        ),
      );

    return NextResponse.json(
      timeline,
    );
  } catch (error) {
    const message =
      getErrorMessage(error);

    console.error(
      "ERRO CUSTOMER TIMELINE GET:",
      error,
    );

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message ===
          "Cliente não encontrado."
            ? 404
            : 500,
      },
    );
  }
}
