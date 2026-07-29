import { NextRequest, NextResponse } from "next/server";

import { customerService } from "@/services/customer.service";

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body = await request.json();

    const customer =
      await customerService.assignResponsible({
        customerId: body.customerId,
        responsibleId: body.responsibleId,
      });

    return NextResponse.json(customer);
  } catch (error) {
    console.error(
      "ERRO CUSTOMERS ASSIGN POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao assumir o atendimento.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}