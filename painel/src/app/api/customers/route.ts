import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  M1MUserPermission,
} from "@/generated/prisma/enums";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  AuthorizationError,
  authorizationService,
} from "@/services/auth/authorization.service";
import {
  customerService,
} from "@/services/customer.service";

function getErrorStatus(
  error: unknown,
) {
  return error instanceof AuthorizationError
    ? error.statusCode
    : 500;
}

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
      await getAuthenticatedCompanyId();

    const remoteJid =
      request.nextUrl.searchParams.get(
        "remoteJid",
      );

    const phone =
      request.nextUrl.searchParams.get(
        "phone",
      );

    if (remoteJid) {
      const customer =
        await customerService.findCustomer(
          companyId,
          remoteJid,
          phone,
        );

      return NextResponse.json(
        customer,
      );
    }

    const customers =
      await customerService.listCustomers({
        companyId,
        search:
          request.nextUrl.searchParams.get(
            "search",
          ),
        status:
          request.nextUrl.searchParams.get(
            "status",
          ),
        responsibleId:
          request.nextUrl.searchParams.get(
            "responsibleId",
          ),
      });

    return NextResponse.json(
      customers,
    );
  } catch (error) {
    console.error(
      "ERRO CUSTOMERS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar os clientes.",
        ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const authorizedUser =
      await authorizationService.requirePermission(
        M1MUserPermission.EDIT_CRM,
      );

    const companyId =
      authorizedUser.companyId;

    const body =
      await request.json();

    const customer =
      await customerService.saveCustomer({
        ...body,
        companyId,
      });

    return NextResponse.json(
      customer,
    );
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
        status: getErrorStatus(error),
      },
    );
  }
}
