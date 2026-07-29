import { NextRequest, NextResponse } from "next/server";

import { getCurrentCompanyId } from "@/lib/tenant";
import { customerService } from "@/services/customer.service";

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
) {
  try {
    const companyId =
      getCurrentCompanyId();

    const remoteJid =
      request.nextUrl.searchParams.get(
        "remoteJid",
      );

    if (!remoteJid) {
      return NextResponse.json(
        {
          error:
            "remoteJid é obrigatório.",
        },
        {
          status: 400,
        },
      );
    }

    const customer =
      await customerService.findCustomer(
        companyId,
        remoteJid,
      );

    return NextResponse.json(customer);
  } catch (error) {
    console.error(
      "ERRO CUSTOMERS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar os dados do cliente.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const companyId =
      getCurrentCompanyId();

    const body = await request.json();

    const customer =
      await customerService.saveCustomer({
        ...body,
        companyId,
      });

    return NextResponse.json(customer);
  } catch (error) {
    console.error(
      "ERRO CUSTOMERS POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao salvar os dados do cliente.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}