import { prisma } from '@/lib/prisma';
import { InvalidContactPhone } from '@/lib/contact-phone';
import {
  after,
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
import { crmService } from '@/services/crm.service';
import { enrichCustomerDisplayIdentities } from "@/services/customer-display-identity.service";

function getErrorStatus(
  error: unknown,
) {
  if (error instanceof InvalidContactPhone) return 400;
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
  const startedAt = Date.now();
  const timing = () => ({ "Server-Timing": `total;dur=${Date.now() - startedAt}` });
  try {
    const companyId =
      await getAuthenticatedCompanyId();

    const view = request.nextUrl.searchParams.get("view");
    if (view === "dashboard") {
      const statuses = await prisma.m1MCustomer.findMany({
        where: { companyId },
        select: { id: true, status: true },
      });
      return NextResponse.json(statuses, { headers: timing() });
    }

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
        customer ? (await enrichCustomerDisplayIdentities(companyId, [customer]))[0] : null,
      );
    }

    const customers =
      await customerService.listCustomers({
        companyId,
        search: null,
        status:
          request.nextUrl.searchParams.get(
            "status",
          ),
        responsibleId:
          request.nextUrl.searchParams.get(
            "responsibleId",
          ),
      });

    const hiddenContact = view === "contacts" ? process.env.M1M_CONTACTS_HIDDEN_CUSTOMER?.trim() : undefined;
    const visibleCustomers = hiddenContact
      ? customers.filter(customer => `${companyId}/${customer.id}` !== hiddenContact)
      : customers;
    const search = request.nextUrl.searchParams.get("search")?.trim().toLocaleLowerCase("pt-BR");
    const presented = await enrichCustomerDisplayIdentities(companyId, visibleCustomers, search ? {} : {
      deferHints: true,
      deferProvider: task => after(async () => { await task; }),
    });
    return NextResponse.json(search ? presented.filter(customer => [
      customer.displayName, customer.displayPhone, customer.contactPhone, customer.name, customer.phone,
      customer.company, customer.city, customer.remoteJid, customer.canonicalJid,
      customer.customerCode?.toString(), customer.customerCode?.toString().padStart(6, "0"),
      customer.responsible, customer.assignedUser?.displayName, customer.assignedUser?.name,
      customer.attendances[0]?.sector?.name,
    ].some(value => value?.toLocaleLowerCase("pt-BR").includes(search))) : presented, { headers: timing() });
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

    await crmService.markManuallyAdded(companyId, customer.id);
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
