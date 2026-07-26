import { NextRequest, NextResponse } from "next/server";

import { customerService } from "@/services/customer.service";

export async function GET(
  request: NextRequest,
) {
  try {
    const companyId =
      request.nextUrl.searchParams.get(
        "companyId",
      );

    const remoteJid =
      request.nextUrl.searchParams.get(
        "remoteJid",
      );

    if (!companyId || !remoteJid) {
      return NextResponse.json(
        {
          error:
            "companyId e remoteJid são obrigatórios.",
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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno.",
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
    const body = await request.json();

    const customer =
      await customerService.saveCustomer(body);

    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno.",
      },
      {
        status: 500,
      },
    );
  }
}